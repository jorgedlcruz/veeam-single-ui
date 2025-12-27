
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, Loader2, Database, Briefcase, FileText, Server } from "lucide-react"
import { Command as CommandPrimitive } from "cmdk"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

import { veeamApi } from "@/lib/api/veeam-client"

interface SearchResult {
    id: string
    name: string
    type: 'VBR Job' | 'VBR Workload' | 'VB365 Job' | 'VB365 Item'
    url: string
    description?: string
}

export function GlobalSearch() {
    const [isOpen, setIsOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<SearchResult[]>([])
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()
    const [debouncedQuery, setDebouncedQuery] = React.useState("")
    const containerRef = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                // Focus the input when shortcut is pressed
                const input = document.querySelector('input[cmdk-input]') as HTMLInputElement
                if (input) {
                    input.focus()
                }
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Debounce query
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query)
        }, 500)
        return () => clearTimeout(timer)
    }, [query])

    // Fetch results
    React.useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2) {
            setResults([])
            return
        }

        const fetchResults = async () => {
            setLoading(true)
            try {
                const data = await veeamApi.globalSearch(debouncedQuery)
                setResults(data as SearchResult[])
                setIsOpen(true)
            } catch (error) {
                console.error("Search failed", error)
            } finally {
                setLoading(false)
            }
        }

        fetchResults()
    }, [debouncedQuery])

    const runCommand = React.useCallback((command: () => unknown) => {
        setIsOpen(false)
        command()
    }, [])

    // Group results
    const groupedResults = React.useMemo(() => {
        const groups: Record<string, SearchResult[]> = {
            'VBR Workload': [],
            'VBR Job': [],
            'VB365 Job': [],
            'VB365 Item': []
        }
        results.forEach(item => {
            if (groups[item.type]) {
                groups[item.type].push(item)
            }
        })
        return groups
    }, [results])

    return (
        <div className="w-full max-w-lg relative" ref={containerRef}>
            <Command
                shouldFilter={false}
                className="rounded-lg border shadow-sm overflow-visible"
            >
                <div className="flex items-center border-b px-3 bg-transparent">
                    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                    <CommandPrimitive.Input
                        placeholder="Search workloads, jobs..."
                        value={query}
                        onValueChange={(val: string) => {
                            setQuery(val)
                            if (val.length >= 2) setIsOpen(true)
                        }}
                        onFocus={() => {
                            if (query.length >= 2) setIsOpen(true)
                        }}
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0 flex-1"
                    />
                    <kbd className="pointer-events-none flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 ml-2">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </div>

                {isOpen && (
                    <div className="absolute top-[calc(100%+4px)] left-0 w-full z-50 rounded-md border bg-popover text-popover-foreground shadow-md outline-none">
                        <CommandList>
                            {loading && (
                                <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </div>
                            )}
                            {!loading && results.length === 0 && query.length >= 2 && (
                                <CommandEmpty>No results found.</CommandEmpty>
                            )}

                            {groupedResults['VBR Workload'].length > 0 && (
                                <CommandGroup heading="Protected Workloads">
                                    {groupedResults['VBR Workload'].map((item) => (
                                        <CommandItem
                                            key={item.id + item.type}
                                            value={item.id}
                                            onSelect={() => runCommand(() => router.push(item.url))}
                                        >
                                            <Server className="mr-2 h-4 w-4" />
                                            <div className="flex flex-col">
                                                <span>{item.name}</span>
                                                {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {groupedResults['VBR Job'].length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Backup Jobs (VBR)">
                                        {groupedResults['VBR Job'].map((item) => (
                                            <CommandItem
                                                key={item.id + item.type}
                                                value={item.id}
                                                onSelect={() => runCommand(() => router.push(item.url))}
                                            >
                                                <Briefcase className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            {groupedResults['VB365 Job'].length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Backup Jobs (VB365)">
                                        {groupedResults['VB365 Job'].map((item) => (
                                            <CommandItem
                                                key={item.id + item.type}
                                                value={item.id}
                                                onSelect={() => runCommand(() => router.push(item.url))}
                                            >
                                                <Database className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}

                            {groupedResults['VB365 Item'].length > 0 && (
                                <>
                                    <CommandSeparator />
                                    <CommandGroup heading="Protected Items (VB365)">
                                        {groupedResults['VB365 Item'].map((item) => (
                                            <CommandItem
                                                key={item.id + item.type}
                                                value={item.id}
                                                onSelect={() => runCommand(() => router.push(item.url))}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                <div className="flex flex-col">
                                                    <span>{item.name}</span>
                                                    {item.description && <span className="text-xs text-muted-foreground">{item.description}</span>}
                                                </div>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </>
                            )}
                        </CommandList>
                    </div>
                )}
            </Command>
        </div>
    )
}
