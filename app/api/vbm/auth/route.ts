// API Route for Veeam Backup for Microsoft 365 Authentication
// This route proxies authentication requests to VBM API

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/utils/rate-limiter';

const VBM_API_URL = process.env.VBM_API_URL;
const VBM_USERNAME = process.env.VBM_USERNAME;
const VBM_PASSWORD = process.env.VBM_PASSWORD;

// VBM API has a rate limit of 1 request per second
const rateLimiter = new RateLimiter(1);

export async function POST(request: NextRequest) {
  try {
    if (!VBM_API_URL || !VBM_USERNAME || !VBM_PASSWORD) {
      console.error('[VBM AUTH] Missing configuration:', {
        hasUrl: !!VBM_API_URL,
        hasUsername: !!VBM_USERNAME,
        hasPassword: !!VBM_PASSWORD,
      });
      return NextResponse.json(
        { error: 'Server configuration error: Missing VBM credentials' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { grant_type, refresh_token } = body;

    console.log('[VBM AUTH] Authentication request, grant_type:', grant_type);

    // Use rate limiter to ensure we don't exceed API quota (1 req/sec)
    const data = await rateLimiter.execute(async () => {
      let authBody: Record<string, string>;
      
      if (grant_type === 'refresh_token' && refresh_token) {
        authBody = {
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
          disable_antiforgery_token: 'true',
        };
      } else {
        authBody = {
          grant_type: 'password',
          username: VBM_USERNAME,
          password: VBM_PASSWORD,
          disable_antiforgery_token: 'true',
        };
      }

      const authUrl = `${VBM_API_URL}/v8/token`;
      console.log('[VBM AUTH] Authenticating with VBM at:', authUrl);

      // Create FormData for application/x-www-form-urlencoded as per VBM API spec
      const formData = new URLSearchParams();
      Object.entries(authBody).forEach(([key, value]) => {
        formData.append(key, value);
      });

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: formData.toString(),
      });

      console.log('[VBM AUTH] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[VBM AUTH] Authentication failed:', errorText);
        throw new Error(`VBM authentication failed: ${response.status} - ${errorText}`);
      }

      const responseData = await response.json();
      console.log('[VBM AUTH] Authentication successful (antiforgery token disabled)');
      
      return responseData;
    });
    
    // Return the authentication data
    // Note: antiforgery token is disabled via disable_antiforgery_token parameter
    return NextResponse.json(data);

  } catch (error) {
    console.error('[VBM AUTH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'VBM authentication failed' },
      { status: 500 }
    );
  }
}
