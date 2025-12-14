"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, useCallback } from "react"
import { BackupJobsTable } from "@/components/backup-jobs-table"
import { veeamApi } from "@/lib/api/veeam-client"
import { VeeamBackupJob } from "@/lib/types/veeam"
import { useSearch } from "@/components/search-provider"

export default function VBRJobsPage() {
    const [jobs, setJobs] = useState<VeeamBackupJob[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { searchQuery } = useSearch()

    // Filter jobs based on search query
    const filteredJobs = useMemo(() => {
        if (!searchQuery.trim()) return jobs

        const query = searchQuery.toLowerCase()
        return jobs.filter(job =>
            job.name?.toLowerCase().includes(query) ||
            job.type?.toLowerCase().includes(query) ||
            job.description?.toLowerCase().includes(query) ||
            job.lastResult?.toLowerCase().includes(query)
        )
    }, [jobs, searchQuery])

    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await veeamApi.getBackupJobs()
            setJobs(data)
        } catch (err) {
            console.error('Failed to fetch backup jobs:', err)
            setError(err instanceof Error ? err.message : 'Failed to fetch backup jobs')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchJobs()

        // Refresh data every 30 seconds
        const interval = setInterval(fetchJobs, 30000)
        return () => clearInterval(interval)
    }, [fetchJobs])

    return (
        <div className="flex-1 overflow-auto">
            <div className="container mx-auto py-8 px-4">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight">Veeam Backup Jobs</h1>
                    <p className="text-muted-foreground mt-2">
                        Monitor and manage your backup jobs
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

                <BackupJobsTable
                    data={filteredJobs}
                    loading={loading}
                    onRefresh={fetchJobs}
                />
            </div>
        </div>
    )
}
