"use client"

import * as React from "react"
import {
    ColumnDef,
    Column,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    getFilteredRowModel,
    ColumnFiltersState,
    getFacetedRowModel,
    getFacetedUniqueValues,
} from "@tanstack/react-table"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { VBMRestorePoint } from "@/lib/types/vbm"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowUpDown, Mail, Globe, Users, Database, Filter } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
// import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

interface VBMRestorePointsTableProps {
    data: VBMRestorePoint[]
    loading?: boolean
    lookupData?: {
        organizations: Record<string, string>,
        repositories: Record<string, string>,
        jobs: Record<string, string>
    }
}

export const columns: ColumnDef<VBMRestorePoint>[] = [
    {
        accessorKey: "backupTime",
        header: ({ column }) => (
            <Button
                variant="ghost"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                className="-ml-4"
            >
                Backup Time
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const date = new Date(row.getValue("backupTime"));
            return <div className="font-medium">{date.toLocaleString()}</div>
        },
    },
    {
        id: "type",
        accessorFn: (row) => {
            if (row.isExchange) return "Exchange";
            if (row.isSharePoint) return "SharePoint";
            if (row.isOneDrive) return "OneDrive";
            if (row.isTeams) return "Teams";
            return "Unknown";
        },
        header: ({ /* column */ }) => {
            return (
                <div className="flex items-center space-x-2">
                    <span>Content Type</span>
                </div>
            )
        },
        cell: ({ row }) => {
            const item = row.original;
            const types = [];
            if (item.isExchange) types.push({ icon: Mail, label: 'Exchange' });
            if (item.isSharePoint) types.push({ icon: Globe, label: 'SharePoint' });
            if (item.isOneDrive) types.push({ icon: Database, label: 'OneDrive' });
            if (item.isTeams) types.push({ icon: Users, label: 'Teams' });

            return (
                <div className="flex gap-2">
                    {types.map((t, i) => (
                        <div key={i} className="flex items-center text-xs bg-muted px-2 py-1 rounded-md" title={t.label}>
                            <t.icon className="h-3 w-3 mr-1" />
                            {t.label}
                        </div>
                    ))}
                    {types.length === 0 && <span className="text-muted-foreground text-xs">Unknown</span>}
                </div>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "organizationId",
        header: "Organization",
        cell: ({ row, table }) => {
            // @ts-expect-error - meta property is not directly typed on table
            const lookup = table.options.meta?.lookupData?.organizations;
            const id = row.getValue("organizationId") as string;
            return <div className="text-sm">{lookup?.[id] || id}</div>
        }
    },
    {
        accessorKey: "repositoryId",
        header: "Repository",
        cell: ({ row, table }) => {
            // @ts-expect-error - meta property is not directly typed on table
            const lookup = table.options.meta?.lookupData?.repositories;
            const id = row.getValue("repositoryId") as string;
            return <div className="text-sm">{lookup?.[id] || id}</div>
        }
    },
    {
        accessorKey: "jobId",
        header: "Job",
        cell: ({ row, table }) => {
            // @ts-expect-error - meta property is not directly typed on table
            const lookup = table.options.meta?.lookupData?.jobs;
            const id = row.getValue("jobId") as string;
            return <div className="text-sm">{lookup?.[id] || id}</div>
        }
    },
    {
        accessorKey: "isCopy",
        header: "Type",
        cell: ({ row }) => {
            const isCopy = row.original.isCopy;
            const isLongTerm = row.original.isLongTermCopy;
            if (isLongTerm) return <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Archive</span>
            if (isCopy) return <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">Copy</span>
            return <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Primary</span>
        }
    }
]

export function VBMRestorePointsTable({ data, loading, lookupData }: VBMRestorePointsTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        state: {
            sorting,
            columnFilters,
        },
        meta: {
            lookupData
        }
    })

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-10 w-[200px]" />
                </div>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Backup Time</TableHead>
                                <TableHead>Content Type</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Repository</TableHead>
                                <TableHead>Job</TableHead>
                                <TableHead>Type</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center py-4">
                {/* Filter for Content Type */}
                <DataTableFacetedFilter
                    column={table.getColumn("type")}
                    title="Content Type"
                    options={[
                        { label: "Exchange", value: "Exchange", icon: Mail },
                        { label: "SharePoint", value: "SharePoint", icon: Globe },
                        { label: "OneDrive", value: "OneDrive", icon: Database },
                        { label: "Teams", value: "Teams", icon: Users },
                    ]}
                />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header) => (
                                    <TableHead key={header.id}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(header.column.columnDef.header, header.getContext())}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id}>
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={columns.length} className="h-24 text-center">
                                    No restore points found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="text-xs text-muted-foreground">
                Showing {table.getRowModel().rows.length} restore points
            </div>
            ```
        </div>
    )
}

function DataTableFacetedFilter({
    column,
    title,
    options,
}: {
    column?: Column<VBMRestorePoint, unknown>
    title: string
    options: {
        label: string
        value: string
        icon?: React.ComponentType<{ className?: string }>
    }[]
}) {
    const facets = column?.getFacetedUniqueValues()
    const selectedValues = new Set(column?.getFilterValue() as string[])

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 border-dashed">
                    <Filter className="mr-2 h-4 w-4" />
                    {title}
                    {selectedValues?.size > 0 && (
                        <>
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal lg:hidden">
                                {selectedValues.size}
                            </Badge>
                            <div className="hidden space-x-1 lg:flex">
                                {selectedValues.size > 2 ? (
                                    <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                        {selectedValues.size} selected
                                    </Badge>
                                ) : (
                                    options
                                        .filter((option) => selectedValues.has(option.value))
                                        .map((option) => (
                                            <Badge
                                                variant="secondary"
                                                key={option.value}
                                                className="rounded-sm px-1 font-normal"
                                            >
                                                {option.label}
                                            </Badge>
                                        ))
                                )}
                            </div>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <div className="p-1">
                    <div className="px-2 py-1.5 text-sm font-semibold">Filter {title}</div>
                    <Separator className="my-1" />
                    {options.map((option) => {
                        const isSelected = selectedValues.has(option.value)
                        return (
                            <div
                                key={option.value}
                                className="flex items-center space-x-2 px-2 py-1.5 rounded-sm hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                onClick={() => {
                                    if (isSelected) {
                                        selectedValues.delete(option.value)
                                    } else {
                                        selectedValues.add(option.value)
                                    }
                                    const filterValues = Array.from(selectedValues)
                                    column?.setFilterValue(
                                        filterValues.length ? filterValues : undefined
                                    )
                                }}
                            >
                                <div
                                    className={`
                        mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary
                        ${isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"}
                    `}
                                >
                                    <CheckIcon className="h-4 w-4" />
                                </div>
                                {option.icon && (
                                    <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                )}
                                <span>{option.label}</span>
                                {facets?.get(option.value) && (
                                    <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                        {facets.get(option.value)}
                                    </span>
                                )}
                            </div>
                        )
                    })}
                    {selectedValues.size > 0 && (
                        <>
                            <Separator className="my-1" />
                            <div
                                className="flex items-center justify-center p-1 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                                onClick={() => column?.setFilterValue(undefined)}
                            >
                                Clear filters
                            </div>
                        </>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    )
}
