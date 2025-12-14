"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { VBMProtectedItemsTable } from "@/components/vbm-protected-items-table"
import { veeamApi } from "@/lib/api/veeam-client"
import { VBMProtectedItem, VBMOrganization } from "@/lib/types/vbm"

export default function VBMProtectedItemsPage() {
    const [items, setItems] = useState<VBMProtectedItem[]>([])
    const [organizations, setOrganizations] = useState<VBMOrganization[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Fetch basic org info first (for filters context, though data contains orgId)
                // And fetch all protected item types concurrently
                const [
                    orgsData,
                    usersData,
                    groupsData,
                    sitesData,
                    teamsData
                ] = await Promise.all([
                    veeamApi.getVBMOrganizations(),
                    veeamApi.getVBMProtectedUsers({ limit: 100 }), // Limit to 100 for MVP
                    veeamApi.getVBMProtectedGroups({ limit: 100 }),
                    veeamApi.getVBMProtectedSites({ limit: 100 }),
                    veeamApi.getVBMProtectedTeams({ limit: 100 }),
                ])

                setOrganizations(orgsData)

                // Combine and tag data
                const allItems: VBMProtectedItem[] = [
                    ...usersData.map(i => ({ ...i, type: 'User' as const })),
                    ...groupsData.map(i => ({ ...i, type: 'Group' as const })),
                    ...sitesData.map(i => ({ ...i, type: 'Site' as const })),
                    ...teamsData.map(i => ({ ...i, type: 'Team' as const })),
                ]

                setItems(allItems)
            } catch (err) {
                console.error('Failed to fetch VBM protected items:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch protected items')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="flex-1 overflow-auto bg-background">
            <div className="container mx-auto py-8 px-4">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Protected Items</h1>
                    <p className="text-muted-foreground mt-2">
                        View and filter all users, groups, sites, and teams protected by Veeam
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium">Error: {error}</p>
                        <p className="text-red-600 text-sm mt-1">
                            Please check your API configuration and credentials
                        </p>
                    </div>
                )}

                <VBMProtectedItemsTable data={items} loading={loading} organizations={organizations} />
            </div>
        </div>
    )
}
