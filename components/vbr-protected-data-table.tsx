"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"
import {
    ArrowUpDown,
    ChevronDown,
    Search,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Table as TableIcon,
    SlidersHorizontal
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { VeeamProtectedWorkload } from "@/lib/types/veeam"
import { useRouter } from "next/navigation"

interface DataTableProps {
    data: VeeamProtectedWorkload[]
    loading?: boolean
}

export function ProtectedDataTable({ data, loading }: DataTableProps) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
    const [rowSelection, setRowSelection] = React.useState({})
    const [globalFilter, setGlobalFilter] = React.useState("")
    const router = useRouter()

    const handleWorkloadClick = React.useCallback((workload: VeeamProtectedWorkload) => {
        const params = new URLSearchParams()
        if (workload.backupId) params.append("backupId", workload.backupId)
        if (workload.id) params.append("objectId", workload.id)
        else if (workload.objectId) params.append("objectId", workload.objectId)

        if (workload.name) params.append("name", workload.name)

        router.push(`/vbr/protected-data/restore-points?${params.toString()}`)
    }, [router])

    const columns = React.useMemo<ColumnDef<VeeamProtectedWorkload>[]>(() => [
        {
            accessorKey: "name",
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                        className="-ml-4"
                    >
                        Workload Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => (
                <div
                    className="font-medium hover:underline text-primary cursor-pointer truncate max-w-[300px]"
                    onClick={() => handleWorkloadClick(row.original)}
                >
                    {row.getValue("name")}
                </div>
            ),
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => (
                <Badge variant="outline" className="font-normal capitalize">
                    {row.getValue("type")}
                </Badge>
            ),
        },
        {
            accessorKey: "platformName",
            header: "Platform",
            cell: ({ row }) => (
                <div className="text-muted-foreground text-sm">{row.getValue("platformName")}</div>
            ),
        },
        {
            id: "restorePointsCount",
            accessorFn: (row) => Number(row.restorePointsCount || 0),
            header: ({ column }) => {
                return (
                    <Button
                        variant="ghost"
                        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    >
                        Points
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                )
            },
            cell: ({ row }) => {
                const count = row.getValue("restorePointsCount") as number;
                return (
                    <div className="flex items-center justify-center font-mono text-sm">
                        <Shield className="w-3 h-3 mr-1 text-primary/70" />
                        {count}
                    </div>
                )
            },
        },
        {
            accessorKey: "lastRunFailed",
            header: "Last Job Status",
            cell: ({ row }) => {
                const failed = row.getValue("lastRunFailed") as boolean;
                if (failed === true) {
                    return (
                        <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" /> Failed
                        </Badge>
                    )
                }
                // If failed is false explicitly, it's a success
                if (failed === false) {
                    return (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Protected
                        </Badge>
                    )
                }
                return <span className="text-muted-foreground">-</span>
            },
        },
    ], [handleWorkloadClick])

    const table = useReactTable({
        data,
        columns,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onRowSelectionChange: setRowSelection,
        onGlobalFilterChange: setGlobalFilter,
        globalFilterFn: "includesString",
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            rowSelection,
            globalFilter,
        },
        initialState: {
            pagination: {
                pageSize: 10
            }
        }
    })

    // Loading Skeleton
    if (loading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="h-10 w-[250px] bg-muted animate-pulse rounded-md" />
                    <div className="h-10 w-[100px] bg-muted animate-pulse rounded-md" />
                </div>
                <div className="rounded-md border p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-12 w-full bg-muted/50 animate-pulse rounded-md" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4">
            {/* Filters Toolbar */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-card p-4 rounded-lg border shadow-sm">
                <div className="flex flex-1 items-center gap-2">
                    <div className="relative flex-1 md:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search all columns..."
                            value={globalFilter ?? ""}
                            onChange={(event) => setGlobalFilter(event.target.value)}
                            className="pl-9 bg-background/50"
                        />
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0">
                                <SlidersHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                            <DropdownMenuCheckboxItem
                                checked={(table.getColumn("lastRunFailed")?.getFilterValue() as boolean) === false}
                                onCheckedChange={(val) => table.getColumn("lastRunFailed")?.setFilterValue(val ? false : undefined)}
                            >
                                Protected (Success)
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={(table.getColumn("lastRunFailed")?.getFilterValue() as boolean) === true}
                                onCheckedChange={(val) => table.getColumn("lastRunFailed")?.setFilterValue(val ? true : undefined)}
                            >
                                Failed
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="ml-auto">
                                <TableIcon className="mr-2 h-4 w-4" />
                                Columns <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {table
                                .getAllColumns()
                                .filter((column) => column.getCanHide())
                                .map((column) => {
                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(value) =>
                                                column.toggleVisibility(!!value)
                                            }
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    )
                                })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border bg-card shadow-sm">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="hover:bg-transparent">
                                {headerGroup.headers.map((header) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-muted/50"
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell key={cell.id} className="py-3">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-32 text-center text-muted-foreground"
                                >
                                    No protected workloads found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                    {table.getFilteredRowModel().rows.length} protected workloads
                </div>
                <div className="space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    )
}
