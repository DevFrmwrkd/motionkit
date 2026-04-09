import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, TrendingUp, DollarSign, Eye, Play } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CreatorOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Creator Overview</h1>
        <p className="text-zinc-400">Track your preset performance and earnings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Views</CardTitle>
            <Eye className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">14.2k</div>
            <p className="text-xs text-green-500 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +12% from last week</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Downloads</CardTitle>
            <Download className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">3,492</div>
            <p className="text-xs text-green-500 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +5% from last week</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">$8,240</div>
            <p className="text-xs text-zinc-500 mt-1">Available to payout: $1,200</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Active Presets</CardTitle>
            <Play className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">12</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
          <CardTitle className="text-lg text-zinc-100">Top Performing Presets</CardTitle>
          <Link href="/creator/upload">
            <Button size="sm" className="bg-amber-500 text-zinc-950 hover:bg-amber-600 font-semibold">Publish New</Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-zinc-950 rounded-lg border border-zinc-800 hover:border-zinc-700 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded overflow-hidden bg-zinc-900 border border-zinc-800 relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-6 h-6 text-zinc-500" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 group-hover:text-amber-400 transition-colors">
                      Cyberpunk Title V{i}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">Titles</Badge>
                      <span className="text-xs text-green-500 font-medium">$450 earned</span>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-zinc-400">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <Download className="w-3 h-3" /> {120 * i}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <Eye className="w-3 h-3" /> {1400 * i}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
