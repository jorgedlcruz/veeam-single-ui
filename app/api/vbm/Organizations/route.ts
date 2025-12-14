// API Route for Veeam Backup for Microsoft 365 Organizations
// This route proxies requests to the VBM365 API to avoid CORS issues

import { NextRequest, NextResponse } from 'next/server';
import type { VBMOrganizationsResponse } from '@/lib/types/vbm';

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
        // Typically VBM uses /v8/Organizations
        const endpoint = `/v8/Organizations?${searchParams.toString()}`;
        const fullUrl = `${VBM_API_URL}${endpoint}`;

        console.log('[VBM ORGS] Fetching from:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[VBM ORGS] API error:', response.status, errorText);
            return NextResponse.json(
                { error: `VBM365 API error: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data: VBMOrganizationsResponse = await response.json();

        console.log(`[VBM ORGS] Retrieved ${data.results?.length || 0} organizations`);

        return NextResponse.json(data);

    } catch (error) {
        console.error('[VBM ORGS] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch VBM organizations' },
            { status: 500 }
        );
    }
}
