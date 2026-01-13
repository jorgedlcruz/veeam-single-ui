
import { veeamOneClient } from "@/lib/api/veeam-one-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ReportSummary } from "@/components/analytics/report-summary"
import { ReportDataTable } from "@/components/analytics/report-data-table"
import { VeeamOneChartResponse, VeeamOneParametersResponse, VeeamOneSummaryResponse, VeeamOneTableResponse } from "@/lib/types/veeam-one"

interface ReportPageProps {
    params: {
        id: string
    }
}

export const dynamic = 'force-dynamic'

export default async function ReportDetailsPage({ params }: ReportPageProps) {
    const { id: taskId } = await params

    // Fetch all required data in parallel
    // Note: For charts, we assume specific section IDs as per user request for "Protected VMs" report.
    // In a generic app, these would be Configurable or discovered.
    // Using hardcoded/extracted IDs from user provided curl commands.
    const [template, parameters, summaryData, protectedVmsChart, backupAgeChart, tableData] = await Promise.all([
        veeamOneClient.getReportTemplate(taskId),
        veeamOneClient.getReportParameters(taskId),

        // Summary Overview (summry1)
        veeamOneClient.getReportSectionData<VeeamOneSummaryResponse>(taskId, 'summry1')
            .then(res => res?.items[0]?.data || []),

        // Chart: Protected VMs (chart_protected_vms)
        veeamOneClient.getReportSectionData<VeeamOneChartResponse>(taskId, 'chart_protected_vms')
            .then(res => res?.items || []),

        // Chart: VM Last Backup Age (Actually called 'chart_vm_last_backup_age' in curl, but maybe label is State)
        // User curl: chart_vm_last_backup_age
        veeamOneClient.getReportSectionData<VeeamOneChartResponse>(taskId, 'chart_vm_last_backup_age')
            .then(res => res?.items || []),

        // Table Data (table_details)
        veeamOneClient.getReportSectionData<VeeamOneTableResponse>(taskId, 'table_details')
            .then(res => res?.items || [])
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
                    {/* We might want to fetch Template Name too, but for now generic header */}
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
