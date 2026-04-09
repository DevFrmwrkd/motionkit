import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Download, TrendingUp } from "lucide-react";

export default function CreatorAnalytics() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Analytics</h1>
        <p className="text-zinc-400">Detailed performance metrics for your published presets.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Impressions (30d)</CardTitle>
            <Eye className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">45.2K</div>
            <p className="text-xs text-green-500 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +14.5%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Clicks (30d)</CardTitle>
            <MousePointerClick className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">8.4K</div>
            <p className="text-xs text-green-500 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +8.2%</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Downloads (30d)</CardTitle>
            <Download className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">1.2K</div>
            <p className="text-xs text-green-500 flex items-center mt-1"><TrendingUp className="w-3 h-3 mr-1" /> +21.4%</p>
          </CardContent>
        </Card>
      </div>

      {/* Note: The charts are mocked with placeholders since recharts relies on client-side rendering
          which can be complex in a server component default. A full implementation would make this
          a "use client" component and render the actual recharts components. */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-lg text-zinc-100">Traffic Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full border border-zinc-800 border-dashed rounded-lg bg-zinc-950 flex flex-col items-center justify-center text-zinc-500 relative overflow-hidden">
            {/* Mock Chart Visualization */}
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-amber-500/10 to-transparent"></div>
            <div className="flex gap-4 items-end h-32 w-full max-w-lg px-8 z-10">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="flex-1 bg-amber-500/20 border border-amber-500/50 rounded-t-sm" style={{ height: `${h}%` }}></div>
              ))}
            </div>
            <div className="absolute bottom-4 flex gap-4 w-full max-w-lg px-8 justify-between text-xs font-mono">
              <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
