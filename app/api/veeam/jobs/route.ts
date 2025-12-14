// API Route for Veeam Backup Jobs
// This route proxies requests to the Veeam API to avoid CORS issues

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

    // Get authorization header from the request
    const authHeader = request.headers.get('authorization');
    console.log('[JOBS] Request received, auth header:', authHeader ? 'Present (Bearer ...)' : 'Missing');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/api/v1/jobs?${queryString}` : '/api/v1/jobs';
    const fullUrl = `${API_BASE_URL}${endpoint}`;

    console.log('[JOBS] Fetching from Veeam:', fullUrl);

    // Use native fetch with NODE_TLS_REJECT_UNAUTHORIZED=0 from env
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-version': '1.3-rev1',
      },
    });

    console.log('[JOBS] Veeam response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[JOBS] Veeam error:', errorText);
      return NextResponse.json(
        { error: `Failed to fetch backup jobs: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('[JOBS] Success - jobs fetched:', data.data?.length || 0, 'jobs');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching backup jobs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch backup jobs' },
      { status: 500 }
    );
  }
}
