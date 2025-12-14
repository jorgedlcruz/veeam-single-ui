
import { NextResponse } from 'next/server';

// Env vars
const API_BASE_URL = process.env.VEEAM_API_URL;
const API_USERNAME = process.env.VEEAM_USERNAME;
const API_PASSWORD = process.env.VEEAM_PASSWORD;

// Helper to get token (server-side only)
async function getVeeamToken(): Promise<string | null> {
    if (!API_BASE_URL || !API_USERNAME || !API_PASSWORD) return null;
    try {
        const body = new URLSearchParams({
            grant_type: 'Password',
            username: API_USERNAME,
            password: API_PASSWORD,
        }).toString();

        const response = await fetch(`${API_BASE_URL}/api/oauth2/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
            },
            body,
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.access_token;
    } catch (e) {
        console.error('Token fetch error:', e);
        return null;
    }
}

export async function GET() {
    try {
        if (!API_BASE_URL) throw new Error('Missing VEEAM_API_URL');

        const token = await getVeeamToken();
        if (!token) throw new Error('Failed to acquire Veeam token');

        const response = await fetch(`${API_BASE_URL}/api/v1/serverInfo`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'x-api-version': '1.3-rev1',
            }
        });

        if (!response.ok) throw new Error(`Failed to fetch server info: ${response.status}`);
        const data = await response.json();

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching server info:', error);
        return NextResponse.json(
            { error: 'Failed to fetch server info' },
            { status: 500 }
        );
    }
}
