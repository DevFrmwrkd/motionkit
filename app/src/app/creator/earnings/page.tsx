import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Download, ArrowUpRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatorEarnings() {
  const transactions = [
    { id: "tx_1", date: "Oct 24, 2023", amount: "+$4.99", preset: "Neon Cyberpunk Title", status: "cleared" },
    { id: "tx_2", date: "Oct 23, 2023", amount: "+$9.99", preset: "Pro Lower Thirds Pack", status: "cleared" },
    { id: "tx_3", date: "Oct 23, 2023", amount: "+$0.00", preset: "Basic Text Intro", status: "free" },
    { id: "tx_4", date: "Oct 21, 2023", amount: "-$125.00", preset: "Payout to Bank", status: "paid" },
    { id: "tx_5", date: "Oct 19, 2023", amount: "+$4.99", preset: "Neon Cyberpunk Title", status: "cleared" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-zinc-100 mb-2">Earnings</h1>
        <p className="text-zinc-400">Manage your revenue, payouts, and transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-amber-500 border-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-800">Available Balance</CardTitle>
            <DollarSign className="w-5 h-5 text-zinc-900" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-extrabold text-zinc-950">$1,245.50</div>
            <Button className="mt-4 bg-zinc-950 text-amber-500 hover:bg-zinc-800 w-full font-bold">
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Revenue (30d)</CardTitle>
            <ArrowUpRight className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">$480.00</div>
            <p className="text-xs text-zinc-500 mt-1">From 96 premium downloads</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Lifetime Earned</CardTitle>
            <DollarSign className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-zinc-100">$8,240.00</div>
            <p className="text-xs text-zinc-500 mt-1">Since Jan 2023</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <CardTitle className="text-lg text-zinc-100">Recent Transactions</CardTitle>
            <CardDescription className="text-zinc-400 mt-1">Your latest sales and payouts.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800">
            <FileText className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent className="pt-6 p-0">
          <div className="divide-y divide-zinc-800">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.amount.startsWith('-') ? 'bg-zinc-800 text-zinc-400' : 'bg-green-500/10 text-green-500'
                  }`}>
                    {tx.amount.startsWith('-') ? <DollarSign className="w-5 h-5" /> : <Download className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-medium text-zinc-200">{tx.preset}</h3>
                    <p className="text-xs text-zinc-500">{tx.date} • {tx.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${tx.amount.startsWith('-') ? 'text-zinc-100' : 'text-green-500'}`}>
                    {tx.amount}
                  </div>
                  <Badge variant="outline" className={`mt-1 text-[10px] ${
                    tx.status === 'cleared' ? 'text-green-500 border-green-500/30' :
                    tx.status === 'free' ? 'text-zinc-500 border-zinc-700' : 'text-amber-500 border-amber-500/30'
                  }`}>
                    {tx.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
