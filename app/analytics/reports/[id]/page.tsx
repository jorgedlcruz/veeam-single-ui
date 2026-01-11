
import { veeamOneClient } from "@/lib/api/veeam-one-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ReportSummary } from "@/components/analytics/report-summary"
import { ReportDataTable } from "@/components/analytics/report-data-table"
import { VeeamOneChartResponse, VeeamOneSummaryResponse, VeeamOneTableResponse } from "@/lib/types/veeam-one"

interface ReportPageProps {
    params: {
        id: string
    }
}

export const dynamic = 'force-dynamic'

// Helper: Poll for resourceId (fast - usually 1 poll)
async function getResourceId(executionId: string): Promise<string | null> {
    for (let i = 0; i < 10; i++) {
        const status = await veeamOneClient.getReportSessionStatus(executionId);
        if (status?.result?.data?.resourceId) {
            return status.result.data.resourceId;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    return null;
}

export default async function ReportDetailsPage({ params }: ReportPageProps) {
    const { id: taskId } = await params

    // Get template info
    const template = await veeamOneClient.getReportTemplate(taskId);

    const sessionId = await veeamOneClient.startWebviewSession();

    const startResult = await veeamOneClient.startReportSession(taskId, [], sessionId);
    if (!startResult) {
        return <div className="container mx-auto py-8 px-4"><h1 className="text-2xl font-bold text-red-500">Failed to start report</h1></div>;
    }

    const resourceId = await getResourceId(startResult.id);
    if (!resourceId) {
        return <div className="container mx-auto py-8 px-4"><h1 className="text-2xl font-bold text-red-500">Failed to get resourceId</h1></div>;
    }

    // Helper: Poll section data until non-empty or max attempts
    async function pollSectionData<T>(
        sectionId: string,
        checkHasData: (data: T | null) => boolean,
        maxAttempts = 20
    ): Promise<T | null> {
        for (let i = 0; i < maxAttempts; i++) {
            const data = await veeamOneClient.getReportSectionData<T>(taskId, sectionId, sessionId, resourceId);
            if (checkHasData(data)) {
                return data;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return await veeamOneClient.getReportSectionData<T>(taskId, sectionId, sessionId, resourceId);
    }

    // Helper: Poll for parameters (returns array of {name, value})
    async function pollParameters(maxAttempts = 20): Promise<{ name: string, value: string }[]> {
        for (let i = 0; i < maxAttempts; i++) {
            const params = await veeamOneClient.getReportParameters(taskId, sessionId, resourceId);
            if (params && params.length > 0) {
                return params;
            }
            await new Promise(r => setTimeout(r, 500));
        }
        return [];
    }

    const [parameters, summaryData, protectedVmsChart, backupAgeChart, tableData] = await Promise.all([
        pollParameters(),
        pollSectionData<VeeamOneSummaryResponse>(
            'summry1',
            (data) => data?.items?.[0]?.data?.length > 0
        ).then(res => res?.items[0]?.data || []),
        pollSectionData<VeeamOneChartResponse>(
            'chart_protected_vms',
            (data) => (data?.items?.length ?? 0) > 0
        ).then(res => res?.items || []),
        pollSectionData<VeeamOneChartResponse>(
            'chart_vm_last_backup_age',
            (data) => (data?.items?.length ?? 0) > 0
        ).then(res => res?.items || []),
        pollSectionData<VeeamOneTableResponse>(
            'table_details',
            (data) => (data?.items?.length ?? 0) > 0
        ).then(res => res?.items || [])
    ])

    return (
        <div className="container mx-auto py-8 px-4 flex flex-col h-full space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/analytics/reports">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{template?.name || 'Report Details'}</h2>
                    <p className="text-muted-foreground text-sm font-mono">{template?.description || taskId}</p>
                </div>
            </div>

            <Tabs defaultValue="summary" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="data">Report Data</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="space-y-6">
                    <ReportSummary
                        parameters={parameters}
                        summaryData={summaryData}
                        protectedVmsChart={protectedVmsChart}
                        backupAgeChart={backupAgeChart}
                    />
                </TabsContent>
                <TabsContent value="data">
                    <ReportDataTable data={tableData} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
