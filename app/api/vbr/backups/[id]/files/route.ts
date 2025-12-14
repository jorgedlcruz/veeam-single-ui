
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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

        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Authorization header required' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const headers = {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'x-api-version': '1.3-rev1',
        };

        // Fetch backup files for the specific backup ID
        // Note: The user provided example uses /backups/{id}/backupFiles
        const response = await fetch(`${API_BASE_URL}/api/v1/backups/${id}/backupFiles?limit=500`, {
            method: 'GET',
            headers,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch backup files for backup ${id}:`, errorText);
            return NextResponse.json(
                { error: `Veeam API error: ${response.status}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching backup files:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch backup files' },
            { status: 500 }
        );
    }
}
