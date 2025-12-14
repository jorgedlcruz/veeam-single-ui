
"use client"

import { useEffect, useState, useCallback } from "react"
import { ShieldAlert, RefreshCw, Database, LayoutGrid } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProtectedDataTable } from "@/components/vbr-protected-data-table"
import { VeeamProtectedWorkload } from "@/lib/types/veeam"
import { veeamApi } from "@/lib/api/veeam-client"

export default function ProtectedDataPage() {
    const [data, setData] = useState<VeeamProtectedWorkload[]>([])
    const [loading, setLoading] = useState(true)
    const [storageStats, setStorageStats] = useState<{ totalBackupSize: number, fileCount: number } | null>(null)
    const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setLoading(true)

            // Parallel fetch for stats and data
            const [protectedData, capacityRes] = await Promise.all([
                veeamApi.getProtectedData(),
                fetch('/api/vbr/StorageCapacity').then(res => res.ok ? res.json() : null)
            ])

            setData(protectedData)
            setStorageStats(capacityRes)
            setLastRefreshed(new Date())
        } catch (error) {
            console.error('Failed to fetch protected data:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Calculate Summary Stats
    const totalObjects = data.length
    // Use storage stats for totals size, but calculate restore points from the workloads themselves to match the grid
    const totalRestorePoints = data.reduce((sum, item) => sum + (item.restorePointsCount || 0), 0)

    const formatBytes = (bytes: number) => {
        if (!bytes) return "0 B"
        const k = 1024
        const sizes = ["B", "KB", "MB", "GB", "TB"]
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Protected Data</h2>
                    <p className="text-muted-foreground">
                        Comprehensive view of all protected workloads across your VBR environment.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {lastRefreshed && (
                        <span className="text-xs text-muted-foreground mr-2">
                            Updated: {lastRefreshed.toLocaleTimeString()}
                        </span>
                    )}
                    <Button onClick={fetchData} disabled={loading} size="sm">
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Workloads
                        </CardTitle>
                        <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalObjects}</div>
                        <p className="text-xs text-muted-foreground">
                            Protected objects found
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Restore Points
                        </CardTitle>
                        <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalRestorePoints}</div>
                        <p className="text-xs text-muted-foreground">
                            Across all workloads
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Backup Size
                        </CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {storageStats ? formatBytes(storageStats.totalBackupSize) : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Total storage consumption
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Top Platform
                        </CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {/* Simple logic to find most common platform */}
                            {data.length > 0 ?
                                Object.entries(data.reduce((acc, curr) => {
                                    acc[curr.platformName] = (acc[curr.platformName] || 0) + 1;
                                    return acc;
                                }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
                                : 'N/A'}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Most common workload type
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Table */}
            <ProtectedDataTable data={data} loading={loading} />
        </div>
    )
}
