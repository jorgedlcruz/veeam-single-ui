"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { VBMRestorePointsTable } from "@/components/vbm-restore-points-table"
import { veeamApi } from "@/lib/api/veeam-client"
import { VBMRestorePoint } from "@/lib/types/vbm"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import Link from "next/link"

function RestorePointsContent() {
    const searchParams = useSearchParams()
    const type = searchParams.get("type")
    const id = searchParams.get("id")
    const name = searchParams.get("name")

    const [items, setItems] = useState<VBMRestorePoint[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lookupData, setLookupData] = useState<{
        organizations: Record<string, string>,
        repositories: Record<string, string>,
        jobs: Record<string, string>
    }>({ organizations: {}, repositories: {}, jobs: {} })

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !type) return

            try {
                setLoading(true)
                setError(null)

                // Fetch lookup data in parallel
                const [restorePoints, orgs, repos, jobs] = await Promise.all([
                    type === 'User' ? veeamApi.getVBMRestorePoints({ userId: id, limit: 100 }) :
                        type === 'Group' ? veeamApi.getVBMRestorePoints({ groupId: id, limit: 100 }) :
                            type === 'Site' ? veeamApi.getVBMRestorePoints({ siteId: id, limit: 100 }) :
                                type === 'Team' ? veeamApi.getVBMRestorePoints({ teamId: id, limit: 100 }) :
                                    Promise.resolve([]),
                    veeamApi.getVBMOrganizations({ limit: 1000 }), // Reasonable limit for now
                    veeamApi.getVBMBackupRepositories({ limit: 1000 }),
                    veeamApi.getVBMJobs({ limit: 1000 })
                ]);

                // Build lookup maps
                const orgMap: Record<string, string> = {};
                orgs.forEach(o => orgMap[o.id] = o.name);

                const repoMap: Record<string, string> = {};
                repos.forEach(r => repoMap[r.id] = r.name);

                const jobMap: Record<string, string> = {};
                jobs.forEach(j => jobMap[j.id] = j.name);

                setLookupData({
                    organizations: orgMap,
                    repositories: repoMap,
                    jobs: jobMap
                });

                setItems(restorePoints)
            } catch (err) {
                console.error('Failed to fetch VBM data:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch restore points data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [type, id])

    if (!type || !id) {
        return <div className="p-8">Invalid parameters. Missing type or ID.</div>
    }

    return (
        <div className="flex-1 overflow-auto bg-background">
            <div className="container mx-auto py-8 px-4">
                <div className="mb-6">
                    <Link href="/vbm/protected-items">
                        <Button variant="ghost" size="sm" className="mb-4 -ml-4">
                            <ChevronLeft className="mr-2 h-4 w-4" />
                            Back to Protected Items
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold tracking-tight">Restore Points</h1>
                    <p className="text-muted-foreground mt-2">
                        Viewing restore points for <span className="font-medium text-foreground">{name || id}</span>
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium">Error: {error}</p>
                    </div>
                )}

                <VBMRestorePointsTable data={items} loading={loading} lookupData={lookupData} />
            </div>
        </div>
    )
}

export default function VBMRestorePointsPage() {
    return (
        <Suspense fallback={<div className="p-8">Loading...</div>}>
            <RestorePointsContent />
        </Suspense>
    )
}
