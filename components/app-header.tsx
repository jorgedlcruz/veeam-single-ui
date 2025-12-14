"use client"

import { GlobalSearch } from "@/components/global-search"
import { ModeToggle } from "@/components/mode-toggle"

export function AppHeader() {
  return (
    <div className="sticky top-0 z-40 bg-background border-b">
      <div className="flex items-center gap-4 px-6 py-3">
        <div className="flex-1 max-w-md">
          <GlobalSearch />
        </div>
        <ModeToggle />
      </div>
    </div>
  )
}
