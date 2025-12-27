"use client"

export const dynamic = 'force-dynamic'

import { useState, useEffect } from "react"
import { BackupJobsTable } from "@/components/backup-jobs-table"
import { TransferRateChart } from "@/components/transfer-rate-chart"
import { veeamApi } from "@/lib/api/veeam-client"
import { VeeamBackupJob, TransferRateDataPoint } from "@/lib/types/veeam"
import { calculateTransferRates } from "@/lib/utils/transfer-rate"

export default function VBRPage() {
  const [jobs, setJobs] = useState<VeeamBackupJob[]>([])
  const [transferRateData, setTransferRateData] = useState<TransferRateDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // const { searchQuery } = useSearch() // Global search removed

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch both jobs and sessions
        const [jobsData, sessionsData] = await Promise.all([
          veeamApi.getBackupJobs(),
          veeamApi.getSessions({ limit: 500, orderColumn: 'CreationTime', orderAsc: false })
        ])

        // Enrich jobs with session data
        const enrichedJobs = jobsData.map(job => {
          // Find the most recent completed session for this job
          const lastCompletedSession = sessionsData.find(s =>
            s.jobId === job.id && s.state === 'Stopped' && s.endTime
          )

          return {
            ...job,
            lastResult: lastCompletedSession?.result?.result,
            lastRun: lastCompletedSession?.endTime,
          }
        })

        setJobs(enrichedJobs)

        // Calculate transfer rate data from sessions
        const transferData = calculateTransferRates(sessionsData)
        setTransferRateData(transferData)
      } catch (err) {
        console.error('Failed to fetch backup jobs:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch backup jobs')
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [])

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

        {/* Transfer Rate Chart */}
        <div className="mb-6">
          <TransferRateChart data={transferRateData} loading={loading} />
        </div>

        <BackupJobsTable data={jobs} loading={loading} />
      </div>
    </div>
  )
}
