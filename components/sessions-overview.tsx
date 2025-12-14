"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts" // Added Cell
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    ColumnDef,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    ColumnFiltersState,
    getFilteredRowModel,
    VisibilityState,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getPaginationRowModel // Added
} from "@tanstack/react-table"
import { VeeamSession } from "@/lib/types/veeam"
import { ArrowUpDown, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Columns, ChevronLeft, ChevronRight, X } from "lucide-react" // Added icons
import { DataTableFacetedFilter } from "@/components/data-table-faceted-filter"

interface SessionsOverviewProps {
    sessions: VeeamSession[]
    loading?: boolean
    onSessionSelect?: (session: VeeamSession) => void
    selectedSessionId?: string | null
    timeRange: "7d" | "30d"
    onTimeRangeChange: (range: "7d" | "30d") => void
}

interface DailyStats {
    date: string
    success: number
    warning: number
    failed: number
    total: number
}

// ... Columns definition (unchanged) ...
export const columns: ColumnDef<VeeamSession>[] = [
    {
        accessorKey: "result.result",
        id: "status",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-4"
                >
                    Status
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const result = row.original.result?.result
            return (
                <Badge
                    variant="outline"
                    className={
                        result === 'Success' ? 'bg-green-50 text-green-700 border-green-200 gap-1' :
                            result === 'Warning' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 gap-1' :
                                result === 'Failed' ? 'bg-red-50 text-red-700 border-red-200 gap-1' :
                                    'text-gray-500 gap-1'
                    }
                >
                    {result === 'Success' && <CheckCircle2 className="w-3 h-3" />}
                    {result === 'Warning' && <AlertTriangle className="w-3 h-3" />}
                    {result === 'Failed' && <XCircle className="w-3 h-3" />}
                    {(!result || result === 'None') && <HelpCircle className="w-3 h-3" />}
                    {result || 'Unknown'}
                </Badge>
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.original.result?.result || "None")
        },
    },
    {
        accessorKey: "name",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Job Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
        accessorKey: "sessionType", // Using sessionType as 'Type'
        id: "type",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Type
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <div className="text-sm text-muted-foreground">{row.getValue("type")}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: "creationTime",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Time
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => {
            const date = new Date(row.getValue("creationTime"))
            return (
                <div className="text-sm">
                    <span>{date.toLocaleDateString()}</span>
                    <span className="text-muted-foreground ml-2">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            )
        },
    },
]


export function SessionsOverview({
    sessions,
    onSessionSelect,
    selectedSessionId,
    timeRange,
    onTimeRangeChange
}: SessionsOverviewProps) {
    // Table State
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

    // Filter State
    const [selectedDate, setSelectedDate] = React.useState<string | null>(null)

    // --- Chart Logic ---
    const chartData = React.useMemo(() => {
        const validSessions = sessions.filter(s => s.creationTime && !isNaN(new Date(s.creationTime).getTime()))
        const statsMap = new Map<string, DailyStats>()
        const daysToShow = timeRange === "7d" ? 7 : 30
        const now = new Date()

        // Initialize days
        for (let i = 0; i < daysToShow; i++) {
            const d = new Date()
            d.setDate(now.getDate() - i)
            const key = d.toISOString().split('T')[0]
            statsMap.set(key, { date: key, success: 0, warning: 0, failed: 0, total: 0 })
        }

        validSessions.forEach(session => {
            const dateKey = new Date(session.creationTime).toISOString().split('T')[0]
            if (statsMap.has(dateKey)) {
                const stat = statsMap.get(dateKey)!
                stat.total++
                if (session.result?.result === 'Success') stat.success++
                else if (session.result?.result === 'Warning') stat.warning++
                else if (session.result?.result === 'Failed') stat.failed++
            }
        })

        return Array.from(statsMap.values()).reverse()
    }, [sessions, timeRange])

    const handleChartClick = (data: { activeLabel?: string } | null) => {
        if (data && data.activeLabel) {
            // Toggle filter if clicking the same date
            if (selectedDate === data.activeLabel) {
                setSelectedDate(null)
            } else {
                setSelectedDate(data.activeLabel)
            }
        }
    }

    // --- Table Logic ---
    // Filter sessions based on selection BEFORE passing to table
    const tableData = React.useMemo(() => {
        if (!selectedDate) return sessions;
        return sessions.filter(session => {
            if (!session.creationTime) return false;
            return session.creationTime.startsWith(selectedDate);
        });
    }, [sessions, selectedDate]);

    const table = useReactTable({
        data: tableData,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getPaginationRowModel: getPaginationRowModel(),
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
        },
        initialState: {
            pagination: {
                pageSize: 10,
            }
        }
    })

    // Basic stats for the header
    const totalSessions = sessions.length
    const successRate = totalSessions > 0
        ? Math.round((sessions.filter(s => s.result?.result === 'Success').length / totalSessions) * 100)
        : 0

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Sessions Overview</CardTitle>
                        <CardDescription>
                            {totalSessions} sessions processed • {successRate}% success rate
                            {selectedDate && (
                                <span className="ml-2 inline-flex items-center text-primary font-medium">
                                    • Filtered: {new Date(selectedDate).toLocaleDateString()}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-4 w-4 ml-1"
                                        onClick={() => setSelectedDate(null)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </span>
                            )}
                        </CardDescription>
                    </div>
                    <Tabs value={timeRange} onValueChange={(v) => {
                        onTimeRangeChange(v as "7d" | "30d");
                        setSelectedDate(null); // Clear filter on range change
                    }}>
                        <TabsList>
                            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
                            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* 1. Bar Chart Section */}
                <div className="h-[250px] w-full cursor-pointer">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={chartData}
                            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                            onClick={handleChartClick}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            <XAxis
                                dataKey="date"
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                fontSize={12}
                                minTickGap={30}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                                cursor={{ fill: "transparent" }} // Custom cursor handled by active bar state? Standard cursor is fine.
                                labelFormatter={(label) => new Date(label).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            />
                            <Bar dataKey="success" name="Success" stackId="a" radius={[0, 0, 4, 4]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-success-${index}`} fill="#22c55e" fillOpacity={selectedDate && selectedDate !== entry.date ? 0.3 : 1} />
                                ))}
                            </Bar>
                            <Bar dataKey="warning" name="Warning" stackId="a" radius={[0, 0, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-warning-${index}`} fill="#eab308" fillOpacity={selectedDate && selectedDate !== entry.date ? 0.3 : 1} />
                                ))}
                            </Bar>
                            <Bar dataKey="failed" name="Failed" stackId="a" radius={[4, 4, 0, 0]}>
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-failed-${index}`} fill="#ef4444" fillOpacity={selectedDate && selectedDate !== entry.date ? 0.3 : 1} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* 2. Controls / Filters for Table */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-1 items-center space-x-2">
                        <Input
                            placeholder="Filter jobs..."
                            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
                            onChange={(event) =>
                                table.getColumn("name")?.setFilterValue(event.target.value)
                            }
                            className="h-8 w-[150px] lg:w-[250px]"
                        />

                        {table.getColumn("status") && (
                            <DataTableFacetedFilter
                                column={table.getColumn("status")}
                                title="Status"
                                options={[
                                    { label: "Success", value: "Success", icon: CheckCircle2 },
                                    { label: "Warning", value: "Warning", icon: AlertTriangle },
                                    { label: "Failed", value: "Failed", icon: XCircle },
                                ]}
                            />
                        )}

                        {table.getColumn("type") && (
                            <DataTableFacetedFilter
                                column={table.getColumn("type")}
                                title="Type"
                                options={
                                    Array.from(new Set(sessions.map(s => s.sessionType))).map(type => ({
                                        label: type,
                                        value: type
                                    }))
                                }
                            />
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="ml-auto hidden h-8 lg:flex">
                                <Columns className="mr-2 h-4 w-4" />
                                View
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[150px]">
                            {table
                                .getAllColumns()
                                .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) => column.toggleVisibility(!!value)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* 3. Data Table */}
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
                                    <TableRow
                                        key={row.id}
                                        data-state={row.original.id === selectedSessionId ? "selected" : undefined}
                                        className={onSessionSelect ? "cursor-pointer hover:bg-muted/50" : ""}
                                        onClick={() => onSessionSelect && onSessionSelect(row.original)}
                                    >
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
                                        No results.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* 4. Pagination */}
                <div className="flex items-center justify-between px-2">
                    <div className="flex-1 text-sm text-muted-foreground">
                        {table.getFilteredRowModel().rows.length} sessions
                    </div>
                    <div className="flex items-center space-x-6 lg:space-x-8">
                        <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium">Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                            >
                                <span className="sr-only">Go to previous page</span>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                            >
                                <span className="sr-only">Go to next page</span>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

            </CardContent>
        </Card>
    )
}
