
import { NextRequest, NextResponse } from 'next/server';
import { BackupObjectsResult, VeeamProtectedWorkload } from '@/lib/types/veeam';

export const dynamic = 'force-dynamic'; // Prevent caching so data is fresh

const API_BASE_URL = process.env.VEEAM_API_URL;

// Simple in-memory cache
let cachedData: {
    data: VeeamProtectedWorkload[];
    timestamp: number;
} | null = null;

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET(request: NextRequest) {
    try {
        if (!API_BASE_URL) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing VEEAM_API_URL' },
                { status: 500 }
            );
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Authorization header required' },
                { status: 401 }
            );
        }

        // Check cache
        const now = Date.now();
        const { searchParams } = new URL(request.url);
        const forceRefresh = searchParams.get('refresh') === 'true';

        if (cachedData && !forceRefresh && (now - cachedData.timestamp < CACHE_TTL)) {
            console.log('Serving protected data from cache');
            return NextResponse.json({ data: cachedData.data });
        }

        // Common headers for Veeam API
        const headers = {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-version': '1.3-rev1',
        };

        // Use the optimized /backupObjects endpoint
        // This gives us a flat list of all protected workloads
        console.log('Fetching protected objects from /backupObjects...');
        const response = await fetch(`${API_BASE_URL}/api/v1/backupObjects?limit=1000`, { // Large limit to get most/all
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            console.error('Failed to fetch backup objects:', await response.text());
            return NextResponse.json({ data: [] });
        }

        const result: BackupObjectsResult = await response.json();
        const objects = result.data;

        // Map to VeeamProtectedWorkload
        // We might not have Job Name or Repository Name here directly, but that's expected/accepted per the plan.
        const protectedWorkloads: VeeamProtectedWorkload[] = objects.map(obj => ({
            ...obj,
            // ID from backupObjects is the object ID we use for referencing
            // It also has restorePointsCount and lastRunFailed
        }));

        // Sort by name
        protectedWorkloads.sort((a, b) => a.name.localeCompare(b.name));

        // Update cache
        cachedData = {
            data: protectedWorkloads,
            timestamp: Date.now()
        };

        console.log(`Cached ${protectedWorkloads.length} protected workloads`);

        return NextResponse.json({
            data: protectedWorkloads,
            total: protectedWorkloads.length
        });

    } catch (error) {
        console.error('Error fetching protected data:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch protected data' },
            { status: 500 }
        );
    }
}
