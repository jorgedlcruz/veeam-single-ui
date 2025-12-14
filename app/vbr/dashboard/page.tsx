"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { DashboardStats } from "@/components/dashboard-stats"
import { SecurityWidget } from "@/components/security-widget"
import { SessionsOverview } from "@/components/sessions-overview"
import { StorageCapacityWidget } from "@/components/storage-capacity-widget"
// import { TransferRateChart } from "@/components/transfer-rate-chart" // Replacing with Sessions Overview
import { veeamApi } from "@/lib/api/veeam-client"
import {
    VeeamBackupJob,
    VeeamSession,
    LicenseModel,
    MalwareEventModel,
    SecurityBestPracticeItem,
    VeeamServerInfo
} from "@/lib/types/veeam"
// import { calculateTransferRates } from "@/lib/utils/transfer-rate"

export default function VBRPage() {
    const [jobs, setJobs] = useState<VeeamBackupJob[]>([])
    // const [repositories, setRepositories] = useState<RepositoryModel[]>([])
    const [serverInfo, setServerInfo] = useState<VeeamServerInfo | null>(null)
    const [license, setLicense] = useState<LicenseModel | null>(null)
    const [malwareEvents, setMalwareEvents] = useState<MalwareEventModel[]>([])
    const [securityItems, setSecurityItems] = useState<SecurityBestPracticeItem[]>([])
    const [sessions, setSessions] = useState<VeeamSession[]>([])
    const [timeRange, setTimeRange] = useState<"7d" | "30d">("7d")
    // const [transferRateData, setTransferRateData] = useState<any[]>([]) 

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)
                setError(null)

                // Calculate date filter
                const now = new Date()
                const fromDate = new Date()
                fromDate.setDate(now.getDate() - (timeRange === "7d" ? 7 : 30))

                // Fetch all dashboard data in parallel
                const [
                    jobsData,
                    sessionsData,
                    reposData,
                    licenseData,
                    malwareData,
                    securityData
                ] = await Promise.all([
                    veeamApi.getBackupJobs(),
                    veeamApi.getSessions({
                        limit: 2000,
                        orderColumn: 'CreationTime',
                        orderAsc: false,
                        createdAfterFilter: fromDate.toISOString()
                    }),
                    // veeamApi.getRepositories(),
                    fetch('/api/vbr/ServerInfo').then(res => res.json()),
                    veeamApi.getLicenseInfo(),
                    veeamApi.getMalwareEvents({ limit: 10 }),
                    veeamApi.getSecurityBestPractices()
                ])

                setJobs(jobsData)
                setSessions(sessionsData)
                // setRepositories(reposData)
                setServerInfo(reposData) // reposData is now serverInfo
                setLicense(licenseData)
                setMalwareEvents(malwareData)
                setSecurityItems(securityData)

                // Calculate transfer rate data from sessions
                // const transferData = calculateTransferRates(sessionsData)
                // setTransferRateData(transferData)
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err)
                setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data')
            } finally {
                setLoading(false)
            }
        }

        fetchData()

        // Refresh data every 30 seconds
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [timeRange])

    // Calculate job stats - count jobs that are currently running
    const activeJobs = jobs.filter(j => j.isRunning || j.status === 'Running').length

    return (
        <div className="flex-1 overflow-auto bg-background">
            <div className="container mx-auto py-8 px-4 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground mt-1">
                            Overview of your backup infrastructure health and performance
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800 font-medium">Error: {error}</p>
                    </div>
                )}

                {/* Top Stats Row */}
                <DashboardStats
                    serverInfo={serverInfo}
                    license={license}
                    malwareEvents={malwareEvents}
                    totalJobs={jobs.length}
                    activeJobs={activeJobs}
                />

                {/* Main Content Areas */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {/* Sessions Overview (Take up 2/3 width on large screens) */}
                    <div className="lg:col-span-2">
                        <SessionsOverview
                            sessions={sessions}
                            loading={loading}
                            timeRange={timeRange}
                            onTimeRangeChange={setTimeRange}
                        />
                    </div>

                    {/* Security Widget and Storage Capacity (Take up 1/3 width) */}
                    <div className="lg:col-span-1 space-y-6">
                        <StorageCapacityWidget />
                        <SecurityWidget items={securityItems} />
                    </div>
                </div>
            </div>
        </div>
    )
}
