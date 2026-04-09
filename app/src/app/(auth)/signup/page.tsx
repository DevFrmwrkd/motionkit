import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <Link href="/" className="text-2xl font-bold tracking-tight text-zinc-100 mb-8 hover:text-amber-500 transition-colors">
        Motion<span className="text-amber-500">Kit</span>
      </Link>
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Create an account</h1>
          <p className="text-sm text-zinc-400 mt-2">Start creating beautiful motion graphics</p>
        </div>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Name</Label>
            <Input id="name" type="text" placeholder="Jane Doe" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Password</Label>
            <Input id="password" type="password" className="bg-zinc-950 border-zinc-800 text-zinc-100 focus-visible:ring-amber-500" required />
          </div>
          <Button type="button" className="w-full bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold h-11 mt-4">
            Create Account
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <span className="border-b border-zinc-800 w-1/5 lg:w-1/4"></span>
          <span className="text-xs text-center text-zinc-500 uppercase">or sign up with</span>
          <span className="border-b border-zinc-800 w-1/5 lg:w-1/4"></span>
        </div>

        <div className="mt-6 flex gap-4">
          <Button type="button" variant="outline" className="w-full border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 h-11">
            GitHub
          </Button>
          <Button type="button" variant="outline" className="w-full border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 h-11">
            Google
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-amber-500 hover:text-amber-400 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
