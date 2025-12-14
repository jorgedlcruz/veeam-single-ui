// API Route for Veeam Repositories
// This route proxies requests to the Veeam API for repository data

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VEEAM_API_URL?.replace(/['"]/g, '').replace(/[\\/\s]+$/, '');

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

        // Extract query parameters
        const { searchParams } = new URL(request.url);
        const queryString = searchParams.toString();
        const endpoint = queryString
            ? `/api/v1/backupInfrastructure/repositories?${queryString}`
            : '/api/v1/backupInfrastructure/repositories';

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { error: `Failed to fetch repositories: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching repositories:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch repositories' },
            { status: 500 }
        );
    }
}
