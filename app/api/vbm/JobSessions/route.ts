// API Route for Veeam Backup for Microsoft 365 Job Sessions
// This route proxies requests to the VBM365 API to avoid CORS issues

import { NextRequest, NextResponse } from 'next/server';
import type { VBMJobSessionsResponse } from '@/lib/types/vbm';

const VBM_API_URL = process.env.VBM_API_URL;

export async function GET(request: NextRequest) {
    try {
        if (!VBM_API_URL) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing VBM_API_URL' },
                { status: 500 }
            );
        }

        // Get authorization header from the request
        const authHeader = request.headers.get('authorization');

        if (!authHeader) {
            return NextResponse.json(
                { error: 'Authorization header required' },
                { status: 401 }
            );
        }

        // Extract query parameters and forward them all
        const { searchParams } = new URL(request.url);

        // Ensure we're targeting the correct endpoint version
        // Typically VBM uses /v8/JobSessions
        const endpoint = `/v8/JobSessions?${searchParams.toString()}`;
        const fullUrl = `${VBM_API_URL}${endpoint}`;

        console.log('[VBM SESSIONS] Fetching from:', fullUrl);

        // Using specialized agent for SSL/TLS if needed, but fetch usually handles it
        // Note: If using self-signed certs in dev, might need rejectionUnauthorized: false
        // but Next.js fetch polyfill might be strict.
        // The existing jobs route didn't use special agent, so standard fetch is likely fine.

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[VBM SESSIONS] API error:', response.status, errorText);
            return NextResponse.json(
                { error: `VBM365 API error: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data: VBMJobSessionsResponse = await response.json();

        console.log(`[VBM SESSIONS] Retrieved ${data.results?.length || 0} sessions`);

        return NextResponse.json(data);

    } catch (error) {
        console.error('[VBM SESSIONS] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch VBM sessions' },
            { status: 500 }
        );
    }
}
