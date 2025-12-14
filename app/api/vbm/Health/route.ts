import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('Authorization');

        // Get query parameters from the request
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.toString();
        const apiUrl = process.env.VBM_API_URL || 'https://127.0.0.1:4443';

        // Ensure /v8 prefix is included
        const endpoint = `/v8/Health${query ? `?${query}` : ''}`;
        const fullUrl = `${apiUrl}${endpoint}`;

        console.log('[VBM HEALTH] Fetching from:', fullUrl);

        const response = await fetch(fullUrl, {
            headers: {
                'Authorization': token || '',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[VBM HEALTH] API error:', response.status, errorText);
            return NextResponse.json(
                { error: `VBM API error: ${response.status} - ${errorText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('[VBM HEALTH] Proxy error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
