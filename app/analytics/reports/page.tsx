import { veeamOneClient } from "@/lib/api/veeam-one-client"
import { ReportCatalog } from "@/components/analytics/report-catalog"

export const dynamic = 'force-dynamic'

export default async function ReportCatalogPage() {
    // Fetch templates first (triggers auth), then tags to avoid race condition
    const templates = await veeamOneClient.getReportTemplates()
    const tags = await veeamOneClient.getReportTags()

    return (
        <div className="container mx-auto py-8 px-4 flex flex-col h-full space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Report Catalog</h2>
                <p className="text-muted-foreground">
                    Browse and generate reports from the library of available templates.
                </p>
            </div>
            <div className="flex-1">
                <ReportCatalog templates={templates} tags={tags} />
            </div>
        </div>
    )
}
