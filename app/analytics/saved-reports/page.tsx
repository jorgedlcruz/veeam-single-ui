
import { veeamOneClient } from "@/lib/api/veeam-one-client"
import { SavedReportsBrowser } from "@/components/analytics/saved-reports-browser"

export const dynamic = 'force-dynamic'

export default async function SavedReportsPage() {
    const reports = await veeamOneClient.getSavedReports()

    return (
        <div className="container mx-auto py-8 px-4 flex flex-col h-full space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Saved Reports</h2>
                <p className="text-muted-foreground">
                    View your organized collection of generated reports.
                </p>
            </div>
            <div className="flex-1">
                <SavedReportsBrowser items={reports} />
            </div>
        </div>
    )
}
