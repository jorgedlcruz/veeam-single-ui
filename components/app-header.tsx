"use client"

import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useSearch } from "@/components/search-provider"
import { ModeToggle } from "@/components/mode-toggle"

interface AppHeaderProps {
  placeholder?: string
}

export function AppHeader({ placeholder = "Search in current view..." }: AppHeaderProps) {
  const { searchQuery, setSearchQuery } = useSearch()

  const handleClear = () => {
    setSearchQuery("")
  }

  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      <div className="flex items-center gap-4 px-6 py-3">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={placeholder}
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7"
                onClick={handleClear}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <ModeToggle />
      </div>
    </div>
  )
}
