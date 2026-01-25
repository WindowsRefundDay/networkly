"use client"

import { Button } from "@/components/ui/button"

import Link from "next/link"

export function QuickActionsWidget() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-4">
        <i className="bx bx-bolt-circle text-xl text-primary" />
        <h3 className="font-semibold text-foreground">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 h-full">
        <Link href="/opportunities" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 hover:border-primary/30 transition-all duration-300">
          <i className="bx bx-search-alt text-2xl mb-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-center">Find Jobs</span>
        </Link>
        
        <Link href="/projects" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 hover:border-primary/30 transition-all duration-300">
          <i className="bx bx-plus-circle text-2xl mb-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-center">Add Project</span>
        </Link>
        
        <Link href="/assistant" className="col-span-2 group flex items-center justify-between px-6 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 border border-primary/20 hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
               <i className="bx bx-bot text-lg text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">AI Career Assistant</div>
              <div className="text-xs text-muted-foreground">Ask for advice</div>
            </div>
          </div>
          <i className="bx bx-right-arrow-alt text-lg text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </div>
  )
}
