// API Route for Veeam Backup for Microsoft 365 Protected Sites
// This route proxies requests to the VBM365 API

import { NextRequest, NextResponse } from 'next/server';

const VBM_API_URL = process.env.VBM_API_URL;

export async function GET(request: NextRequest) {
    try {
        if (!VBM_API_URL) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing VBM_API_URL' },
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

        const { searchParams } = new URL(request.url);
        const endpoint = `/v8/ProtectedSites?${searchParams.toString()}`;
        const fullUrl = `${VBM_API_URL}${endpoint}`;

        console.log('[VBM SITES] Fetching from:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[VBM SITES] API error:', response.status, errorText);
            return NextResponse.json(
                { error: `VBM365 API error: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('[VBM SITES] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch VBM sites' },
            { status: 500 }
        );
    }
}
