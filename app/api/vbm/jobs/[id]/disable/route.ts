import { NextRequest, NextResponse } from 'next/server';

const VBM_API_URL = process.env.VBM_API_URL;

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const fullUrl = `${VBM_API_URL}/v8/Jobs/${id}/disable`;

        console.log('[VBM JOB] Disabling job:', fullUrl);

        const response = await fetch(fullUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
        });

        // 204 No Content is expected for success
        if (response.status === 204) {
            return new NextResponse(null, { status: 204 });
        }

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[VBM JOB] Disable failed:', response.status, errorText);
            return NextResponse.json(
                { error: `VBM API error: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        // Handle case where it might return JSON
        const data = await response.json().catch(() => ({}));
        return NextResponse.json(data);

    } catch (error) {
        console.error('[VBM JOB] Error disabling job:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to disable job' },
            { status: 500 }
        );
    }
}
