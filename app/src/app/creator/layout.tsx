import Link from "next/link";
import { LayoutDashboard, Upload, BarChart3, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight text-zinc-100 hover:text-amber-500 transition-colors">
            Motion<span className="text-amber-500">Kit</span> <span className="text-xs text-amber-500/50 uppercase tracking-widest ml-1">Creator</span>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-1 px-3">
          <Link href="/creator" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition-colors">
            <LayoutDashboard className="w-4 h-4" /> Overview
          </Link>
          <Link href="/creator/upload" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition-colors">
            <Upload className="w-4 h-4" /> Upload Preset
          </Link>
          <Link href="/creator/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition-colors">
            <BarChart3 className="w-4 h-4" /> Analytics
          </Link>
          <Link href="/creator/earnings" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-zinc-900 text-zinc-300 hover:text-zinc-100 transition-colors">
            <DollarSign className="w-4 h-4" /> Earnings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur sticky top-0 z-10 shrink-0">
          <h2 className="text-sm font-medium text-zinc-400">Creator Studio</h2>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" className="text-zinc-400 hover:text-zinc-100">
                User Dashboard
              </Button>
            </Link>
            <Link href="/creator/upload">
              <Button className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold px-4 py-2 h-9 rounded-lg transition-colors">
                <Upload className="w-4 h-4 mr-2" /> New Preset
              </Button>
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
