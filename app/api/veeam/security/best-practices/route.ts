// API Route for Veeam Security Best Practices
// This route proxies requests to the Veeam API for security compliance data

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VEEAM_API_URL;

export async function GET(request: NextRequest) {
    try {
        if (!API_BASE_URL) {
            return NextResponse.json(
                { error: 'Server configuration error: Missing VEEAM_API_URL' },
                { status: 500 }
            );
        }

        const authHeader = request.headers.get('authorization');
        console.log('[SECURITY] Request received, auth header:', authHeader ? 'Present (Bearer ...)' : 'Missing');
        
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
            ? `/api/v1/securityAnalyzer/bestPractices?${queryString}`
            : '/api/v1/securityAnalyzer/bestPractices';
        
        const fullUrl = `${API_BASE_URL}${endpoint}`;
        console.log('[SECURITY] Fetching from Veeam:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
            },
        });

        console.log('[SECURITY] Veeam response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[SECURITY] Veeam error:', response.status, errorText);
            
            if (response.status === 403) {
                return NextResponse.json(
                    { 
                        error: 'Permission denied: User lacks GetBestPracticesComplianceResult permission',
                        details: 'The current user does not have the required Veeam Backup Administrator or Veeam Security Administrator role',
                        veeamError: errorText
                    },
                    { status: 403 }
                );
            }
            
            return NextResponse.json(
                { error: `Failed to fetch security best practices: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('[SECURITY] Success - best practices fetched');
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching best practices:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch best practices' },
            { status: 500 }
        );
    }
}
