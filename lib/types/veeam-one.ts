export interface VeeamOneReportTemplate {
    reportTemplateId: number;
    name: string;
    description: string;
    packName: string;
    infrastructure: number;
    tags: number[]; // Array of tag IDs
    uid?: string;
}

export interface VeeamOneTag {
    tagId: number;
    tag: string;
}

export interface VeeamOneGridNode {
    id: string;
    name: string;
    type: "Folder" | "Report";
    children?: VeeamOneGridNode[];
    // helper fields for UI
    hasChildren?: boolean;
}

// Response wrappers
export interface VeeamOneTemplatesResponse {
    total: number;
    results: VeeamOneReportTemplate[];
}

export interface VeeamOneTagsResponse {
    results: VeeamOneTag[];
}

// --- Report Details Types ---

export interface VeeamOneReportParameter {
    name: string
    value: string
}

export interface VeeamOneSummaryItem {
    name: string
    value: string
    indent?: number
}

// Chart Data Types
export interface VeeamOneChartItem {
    value_formatted_: string
    value: string
    group: string
    color: string
}

// Table Data Types (Dynamic generic structure as observed)
export interface VeeamOneTableItem {
    row_id: string
    [key: string]: string | number | boolean | null
}

export interface VeeamOneTableResponse {
    items: VeeamOneTableItem[]
    totalCount: number
}

export interface VeeamOneChartResponse {
    items: VeeamOneChartItem[]
    totalCount: number
}

export interface VeeamOneSummaryResponse {
    items: {
        name: string
        data: VeeamOneSummaryItem[]
    }[]
    totalCount: number
}

export interface VeeamOneParametersResponse {
    items: VeeamOneReportParameter[]
    totalCount: number
}
