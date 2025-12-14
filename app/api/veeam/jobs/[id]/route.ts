// API Route for Individual Veeam Backup Job Operations
// This route proxies requests to the Veeam API for specific job operations

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VEEAM_API_URL;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!API_BASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing VEEAM_API_URL' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}`, {
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
        { error: `Failed to fetch job: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!API_BASE_URL) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing VEEAM_API_URL' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body; // 'start', 'stop', 'retry', 'disable', 'enable'

    if (!action || !['start', 'stop', 'retry', 'disable', 'enable'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, retry, disable, or enable' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${id}/${action}`, {
      method: 'POST',
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
        { error: `Failed to ${action} job: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error performing job action:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to perform job action' },
      { status: 500 }
    );
  }
}
