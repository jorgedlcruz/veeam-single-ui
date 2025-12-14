// API Route for Veeam Backup for Microsoft 365 Jobs
// This route proxies requests to the VBM365 API to avoid CORS issues

import { NextRequest, NextResponse } from 'next/server';
import type { VBMJobsResponse } from '@/lib/types/vbm';

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

    // Extract query parameters (offset, limit, etc.)
    const { searchParams } = new URL(request.url);
    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '30';
    
    const params = new URLSearchParams({ offset, limit });
    const endpoint = `/v8/Jobs?${params.toString()}`;
    const fullUrl = `${VBM_API_URL}${endpoint}`;

    console.log('[VBM JOBS] Fetching from:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[VBM JOBS] API error:', response.status, errorText);
      return NextResponse.json(
        { error: `VBM365 API error: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data: VBMJobsResponse = await response.json();
    
    console.log(`[VBM JOBS] Retrieved ${data.results?.length || 0} jobs`);
    
    return NextResponse.json(data);

  } catch (error) {
    console.error('[VBM JOBS] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch VBM jobs' },
      { status: 500 }
    );
  }
}
