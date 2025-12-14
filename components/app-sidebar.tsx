"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { BookOpen, ChevronDown, Briefcase, Server, Shield, ShieldCheck, LayoutDashboard, Mail } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

// VBR Group with subpages
const vbrItems = [
  {
    title: "Dashboard",
    href: "/vbr/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Protected Data",
    href: "/vbr/protected-data",
    icon: Shield,
  },
  {
    title: "Jobs & Policies",
    href: "/vbr/jobs",
    icon: Briefcase,
  },
  {
    title: "Managed Servers",
    href: "/vbr/managed-servers",
    icon: Server,
  },
]

// VBM Group - Veeam Backup for M365
const vbmItems = [
  {
    title: "Dashboard",
    href: "/vbm/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Organizations",
    href: "/vbm/organizations",
    icon: Server,
  },
  {
    title: "Protected Items",
    href: "/vbm/protected-items",
    icon: Shield,
  },
  {
    title: "Backup Jobs",
    href: "/vbm/jobs",
    icon: Briefcase,
  },
]

// VRO Group - Veeam Recovery Orchestrator
const vroItems = [
  {
    title: "Recovery Plans",
    href: "/vro",
    icon: ShieldCheck,
  },
]

// K10 Group - single page
const k10Items = [
  {
    title: "Overview",
    href: "/k10",
    icon: ShieldCheck,
  },
]

const documentationItems = [
  {
    title: "Veeam Backup & Replication",
    href: "https://helpcenter.veeam.com/docs/backup/vsphere/overview.html",
  },
  {
    title: "Veeam Recovery Orchestrator",
    href: "https://helpcenter.veeam.com/docs/vro/userguide/overview.html",
  },
  {
    title: "Veeam Backup for M365",
    href: "https://helpcenter.veeam.com/docs/vbo365/guide/vbo_introduction.html",
  },
  {
    title: "Kasten K10",
    href: "https://docs.kasten.io/",
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [vbrOpen, setVbrOpen] = React.useState(true)
  const [vbmOpen, setVbmOpen] = React.useState(true)
  const [vroOpen, setVroOpen] = React.useState(true)
  const [k10Open, setK10Open] = React.useState(true)
  const [documentationOpen, setDocumentationOpen] = React.useState(false)

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex h-16 items-center justify-center group-data-[collapsible=icon]:h-12">
          <Image
            src="/logo.webp"
            alt="VBR Connect"
            width={120}
            height={40}
            className="object-contain w-full h-full group-data-[collapsible=icon]:hidden"
            priority
          />
          <LayoutDashboard className="hidden group-data-[collapsible=icon]:block w-6 h-6 text-primary" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {/* VBR Group */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors"
            onClick={() => setVbrOpen(!vbrOpen)}
          >
            <SidebarGroupLabel className="flex items-center gap-2 flex-1">
              <Server className="h-4 w-4" />
              <span>Veeam Backup & Replication</span>
            </SidebarGroupLabel>
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${vbrOpen ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
          {vbrOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {vbrItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* VBM Group */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors"
            onClick={() => setVbmOpen(!vbmOpen)}
          >
            <SidebarGroupLabel className="flex items-center gap-2 flex-1">
              <Mail className="h-4 w-4" />
              <span>Veeam Backup for M365</span>
            </SidebarGroupLabel>
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${vbmOpen ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
          {vbmOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {vbmItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* VRO Group */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors"
            onClick={() => setVroOpen(!vroOpen)}
          >
            <SidebarGroupLabel className="flex items-center gap-2 flex-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Veeam Recovery Orchestrator</span>
            </SidebarGroupLabel>
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${vroOpen ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
          {vroOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {vroItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* K10 Group */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors"
            onClick={() => setK10Open(!k10Open)}
          >
            <SidebarGroupLabel className="flex items-center gap-2 flex-1">
              <ShieldCheck className="h-4 w-4" />
              <span>Kasten K10</span>
            </SidebarGroupLabel>
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${k10Open ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
          {k10Open && (
            <SidebarGroupContent>
              <SidebarMenu>
                {k10Items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.title}>
                      <Link href={item.href}>
                        {item.icon && <item.icon className="h-4 w-4" />}
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>

        {/* Documentation Group */}
        <SidebarGroup>
          <div
            className="flex items-center justify-between cursor-pointer hover:bg-sidebar-accent rounded-md transition-colors"
            onClick={() => setDocumentationOpen(!documentationOpen)}
          >
            <SidebarGroupLabel className="flex items-center gap-2 flex-1">
              <BookOpen className="h-4 w-4" />
              <span>Documentation</span>
            </SidebarGroupLabel>
            <ChevronDown
              className={`h-4 w-4 mr-2 transition-transform ${documentationOpen ? 'rotate-0' : '-rotate-90'}`}
            />
          </div>
          {documentationOpen && (
            <SidebarGroupContent>
              <SidebarMenu>
                {documentationItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild>
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-4">
        <div className="text-center text-sm text-muted-foreground">
          Created by Team-1 2025
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
