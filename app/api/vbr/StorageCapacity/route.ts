import { NextResponse } from 'next/server';
import { VeeamBackupFile } from '@/lib/types/veeam';

// Env vars
const API_BASE_URL = process.env.VEEAM_API_URL;
const API_USERNAME = process.env.VEEAM_USERNAME;
const API_PASSWORD = process.env.VEEAM_PASSWORD;

// Helper to get token (server-side only)
async function getVeeamToken(): Promise<string | null> {
    if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) return null;
    try {
        const body = new URLSearchParams({
            grant_type: 'Password',
            username: API_USERNAME,
            password: API_PASSWORD,
        }).toString();

        const response = await fetch(`${API_BASE_URL}/api/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
                // Ignore self-signed certs if needed (VEEAM_IGNORE_SSL_ERRORS=true)
            },
            body,
        });

        if (!response.ok) {
            console.error('Token fetch failed:', response.status);
            return null;
        }
        const data = await response.json();
        return data.access_token;
    } catch (e) {
        console.error('Token fetch error:', e);
        return null;
    }
}

export async function GET() {
    try {
        if (!API_BASE_URL) throw new Error('Missing VEEAM_API_URL');

        const token = await getVeeamToken();
        if (!token) throw new Error('Failed to acquire Veeam token');

        console.log('[StorageCapacity] Fetching backups...');

        // 1. Fetch Backups directly
        const backupsRes = await fetch(`${API_BASE_URL}/api/v1/backups?limit=500`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
            }
        });

        if (!backupsRes.ok) throw new Error(`Failed to fetch backups: ${backupsRes.status}`);
        const backupsData = await backupsRes.json();
        const backups = backupsData.data || [];
        console.log(`[StorageCapacity] Found ${backups.length} backups`);

        // 2. Fetch files for each backup
        const backupFilesPromises: (() => Promise<VeeamBackupFile[]>)[] = backups.map((backup: { id: string }) => async () => {
            try {
                const filesRes = await fetch(`${API_BASE_URL}/api/v1/backups/${backup.id}/backupFiles?limit=500`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json',
                        'x-api-version': '1.3-rev1',
                    }
                });
                if (!filesRes.ok) return [];
                const filesData = await filesRes.json();
                return filesData.data || [];
            } catch (e) {
                console.error(`Failed to fetch files for backup ${backup.id}`, e);
                return [];
            }
        });

        const chunkArray = <T>(arr: T[], size: number): T[][] => {
            return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                arr.slice(i * size, i * size + size)
            );
        };

        const chunks = chunkArray(backupFilesPromises, 10);
        const allFiles: VeeamBackupFile[] = [];

        for (const chunk of chunks) {
            const results = await Promise.all(chunk.map(fn => fn()));
            results.forEach((files: VeeamBackupFile[]) => allFiles.push(...files));
        }

        // 3. Calculate Stats
        let totalBackupSize = 0;
        let totalDataSize = 0;
        let totalDedupRatio = 0;
        let totalCompressRatio = 0;
        let fileCount = 0;

        allFiles.forEach((file: VeeamBackupFile) => {
            totalBackupSize += file.backupSize;
            totalDataSize += file.dataSize;
            totalDedupRatio += file.dedupRatio;
            totalCompressRatio += file.compressRatio;
            fileCount++;
        });

        const avgDedupRatio = fileCount > 0 ? Math.round(totalDedupRatio / fileCount) : 0;
        const avgCompressRatio = fileCount > 0 ? Math.round(totalCompressRatio / fileCount) : 0;

        const result = {
            totalBackupSize,
            totalDataSize,
            avgDedupRatio,
            avgCompressRatio,
            fileCount,
            backupCount: backups.length
        };

        return NextResponse.json(result);

    } catch (error) {
        console.error('Error calculating storage capacity:', error);
        return NextResponse.json(
            { error: 'Failed to calculate storage capacity' },
            { status: 500 }
        );
    }
}
