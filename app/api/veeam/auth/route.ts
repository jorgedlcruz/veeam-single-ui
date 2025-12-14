// API Route for Veeam Authentication
// This route handles authentication with the Veeam API server-side to avoid CORS issues

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.VEEAM_API_URL;
const API_USERNAME = process.env.VEEAM_USERNAME;
const API_PASSWORD = process.env.VEEAM_PASSWORD;

interface TokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  '.issued': string;
  '.expires': string;
  username: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) {
      return NextResponse.json(
        { error: 'Server configuration error: Missing required environment variables' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { grant_type, refresh_token } = body;

    console.log('[AUTH] Request received:', { grant_type });

    // Build authentication headers
    const headers: HeadersInit = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'x-api-version': '1.3-rev1',
    };

    let requestBody: string;

    if (grant_type === 'refresh_token' && refresh_token) {
      // Refresh token flow
      requestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }).toString();
    } else {
      // Initial authentication flow with username/password in body
      const params: Record<string, string> = {
        grant_type: 'Password',
        username: API_USERNAME || '',
        password: API_PASSWORD || '',
      };
      requestBody = new URLSearchParams(params).toString();
    }

    const response = await fetch(`${API_BASE_URL}/api/oauth2/token`, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Authentication failed: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data: TokenResponse = await response.json();
    console.log('[AUTH] Success - token acquired');
    return NextResponse.json(data);

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 500 }
    );
  }
}
