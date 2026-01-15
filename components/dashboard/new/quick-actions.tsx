"use client"

import { Button } from "@/components/ui/button"
import { Zap, PlusCircle, PenTool, Search } from "lucide-react"
import Link from "next/link"

export function QuickActionsWidget() {
  return (
    <div className="h-full flex flex-col p-6">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-amber-500" />
        <h3 className="font-semibold text-foreground">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3 h-full">
        <Link href="/opportunities" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 hover:border-primary/30 transition-all duration-300">
          <Search className="w-6 h-6 mb-2 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-center">Find Jobs</span>
        </Link>
        
        <Link href="/projects" className="group flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent border border-border/50 hover:border-primary/30 transition-all duration-300">
          <PlusCircle className="w-6 h-6 mb-2 text-emerald-500 group-hover:scale-110 transition-transform" />
          <span className="text-xs font-medium text-center">Add Project</span>
        </Link>
        
        <Link href="/assistant" className="col-span-2 group flex items-center justify-between px-6 py-3 rounded-xl bg-gradient-to-r from-primary/10 to-transparent hover:from-primary/20 border border-primary/20 hover:border-primary/50 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-primary/20 p-2 rounded-lg">
               <PenTool className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold">AI Career Assistant</div>
              <div className="text-xs text-muted-foreground">Ask for advice</div>
            </div>
          </div>
          <Zap className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>
      </div>
    </div>
  )
}
