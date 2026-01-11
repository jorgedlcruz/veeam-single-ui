import { VeeamOneReportTemplate, VeeamOneTag, VeeamOneGridNode, VeeamOneReportParameter, VeeamOneParametersResponse, VeeamOneSummaryResponse } from '@/lib/types/veeam-one';
import process from 'process';

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

class VeeamOneClient {
    private token: string | null = null;
    private tokenExpiry: Date | null = null;
    private apiUrl: string;

    constructor() {
        this.apiUrl = process.env.VEEAM_ONE_API_URL || '';
        // Ensure no trailing slash
        if (this.apiUrl.endsWith('/')) {
            this.apiUrl = this.apiUrl.slice(0, -1);
        }
    }

    private async authenticate(): Promise<string> {
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        if (!this.apiUrl) {
            console.warn('VEEAM_ONE_API_URL not configured');
            return '';
        }

        try {
            const username = process.env.VEEAM_ONE_USERNAME || '';
            const password = process.env.VEEAM_ONE_PASSWORD || '';

            const body = new URLSearchParams();
            body.append('grant_type', 'password');
            body.append('username', username);
            body.append('password', password);

            // User specified /api/token for auth, overriding the v2.3 default
            const response = await fetch(`${this.apiUrl}/api/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json',
                },
                body: body,
                cache: 'no-store', // Next.js specific
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Authentication failed: ${response.status} ${text}`);
            }

            const data: TokenResponse = await response.json();
            this.token = data.access_token;
            // expires_in is in seconds (899 approx 15 mins)
            this.tokenExpiry = new Date(Date.now() + (data.expires_in - 60) * 1000); // 1 min buffer

            return this.token;
        } catch (error) {
            console.error('Veeam ONE Auth Error:', error);
            throw error;
        }
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const token = await this.authenticate();

        // Some Veeam ONE APIs use query param for auth?
        // User curl used `userContextId`.
        // Standard V2 is Bearer. We'll try Bearer.

        const url = `${this.apiUrl}${path}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const response = await fetch(url, {
            ...options,
            headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            // Try reading body
            const text = await response.text();
            throw new Error(`API Request failed: ${response.status} ${path} - ${text}`);
        }

        // Handle 204
        if (response.status === 204) return {} as T;

        return response.json();
    }

    async getReportTemplates(): Promise<VeeamOneReportTemplate[]> {
        // URL: /api/v2.3/reportPacks/templates
        try {
            const data = await this.request<{ templates: VeeamOneReportTemplate[] }>('/api/v2.3/reportPacks/templates?Limit=1000');
            // Check structure. User provided JSON suggests top level array or object?
            // User said: "Result: [ { ... } ]". Assuming array.
            // Result format: { items: [...], totalCount: number }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).items) return (data as any).items;

            // Fallback checks
            if (Array.isArray(data)) return data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).results) return (data as any).results;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).templates) return (data as any).templates;

            return []
        } catch (e) {
            console.error("Error fetching report templates", e);
            return [];
        }
    }

    async getReportTags(): Promise<VeeamOneTag[]> {
        // URL: /api/v2.3/reportPacks/tags
        try {
            const data = await this.request<VeeamOneTag[]>('/api/v2.3/reportPacks/tags');
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).items) return (data as any).items;
            if (Array.isArray(data)) return data;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).results) return (data as any).results;
            return [];
        } catch (e) {
            console.error("Error fetching tags", e);
            return [];
        }
    }

    async getSavedReports(): Promise<VeeamOneGridNode[]> {
        // URL: /api/v2.3/folders/gridTree
        try {
            // User provided userContextId in curl command is required.
            const userContextId = '663e07ff-d485-4f7a-a60d-b0f5cd591026';
            const data = await this.request<any>(`/api/v2.3/folders/gridTree?userContextId=${userContextId}`);

            // Log keys to identify the correct structure
            if (data && typeof data === 'object' && !Array.isArray(data)) {
                console.log("Saved Reports Keys:", Object.keys(data));
            } else {
                console.log("Saved Reports is Array/Primitive. IsArray:", Array.isArray(data));
            }

            // Robustness checks
            if (Array.isArray(data)) return data;
            if (data?.items) return data.items;
            if (data?.results) return data.results;
            if (data?.data) return data.data;
            if (data?.children) return data.children;
            if (data?.folders) return data.folders;
            // Check if it's a single root node (e.g. has id/children)
            if (data?.id && (data?.children || data?.parentId === 0)) return [data];

            return [];
        } catch (e) {
            console.error("Error fetching saved reports", e);
            return [];
        }
    }

    async getReportParameters(taskId: string): Promise<VeeamOneReportParameter[]> {
        // DEMO OVERRIDE
        const DEMO_TASK_ID = '8a56d84f-1790-4f54-ab20-2e0bfdefa16b';

        const isDemo = taskId === DEMO_TASK_ID;
        const url = isDemo
            ? `/api/v2.3/webview/report/tasks/${taskId}/sections/parameters/data?userContextId=663e07ff-d485-4f7a-a60d-b0f5cd591026`
            : `/api/v2.3/webview/report/tasks/${taskId}/sections/parameters/data`;

        const body = isDemo ? {
            "session": { "sessionId": "9afb1dc2-5682-4093-a97d-dfbef8ca65d0" },
            "resourceId": "6c212f02-4926-4f91-9c50-083d395ef31a", // Updated per user request
            "query": {}
        } : {
            "session": { "sessionId": "dummy-session" },
            "resourceId": "dummy-resource",
            "query": {}
        };

        try {
            const data = await this.request<VeeamOneParametersResponse>(url, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            if (data && data.items) return data.items;
            return [];
        } catch (e) {
            console.warn("Error fetching report parameters, using mock for demo if applicable", e);
            if (taskId === DEMO_TASK_ID) {
                return [
                    { name: "Scope", value: "Virtual Infrastructure" },
                    { name: "Exclusions", value: "None" },
                    { name: "Period", value: "Last 24 Hours" }
                ];
            }
            return [];
        }
    }

    async getReportSummary(taskId: string): Promise<VeeamOneSummaryResponse['items']> {
        return []; // Keeping generic stub if needed, but we use getReportSectionData mainly
    }

    async getReportSectionData<T>(taskId: string, sectionId: string): Promise<T | null> {
        // DEMO OVERRIDE: Use specific ID parameters if requesting the demo task
        // This ensures we hit the real API endpoint the user identified as working.
        const DEMO_TASK_ID = '8a56d84f-1790-4f54-ab20-2e0bfdefa16b';

        const isDemo = taskId === DEMO_TASK_ID;
        const url = isDemo
            ? `/api/v2.3/webview/report/tasks/${taskId}/sections/${sectionId}/data?userContextId=663e07ff-d485-4f7a-a60d-b0f5cd591026`
            : `/api/v2.3/webview/report/tasks/${taskId}/sections/${sectionId}/data`;

        const body = isDemo ? {
            "session": { "sessionId": "9afb1dc2-5682-4093-a97d-dfbef8ca65d0" },
            "resourceId": "6c212f02-4926-4f91-9c50-083d395ef31a", // Updated per user request
            "query": { "offset": 0, "limit": 500 }
        } : {
            "session": { "sessionId": "dummy-session" }, // Fallback for non-demo (should be dynamic in real app)
            "resourceId": "dummy-resource",
            "query": {}
        };

        try {
            const data = await this.request<T>(url, {
                method: 'POST',
                body: JSON.stringify(body)
            });
            return data;
        } catch (e) {
            console.error(`Error fetching section ${sectionId}`, e);
            // Removed strict mock fallback to force real API usage as requested.
            return null;
        }
    }

    async getReportTemplate(id: string | number): Promise<VeeamOneReportTemplate | undefined> {
        // Since we don't have a direct "get one" endpoint confirmed, we fetch all and find types.
        // Optimally we'd cache this or use a real endpoint.
        const templates = await this.getReportTemplates();
        return templates.find(t => t.reportTemplateId.toString() === id.toString() || t.uid === id);
    }
}

export const veeamOneClient = new VeeamOneClient();
