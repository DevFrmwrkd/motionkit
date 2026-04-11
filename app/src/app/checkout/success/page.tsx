"use client";

/**
 * Post-checkout success page. Stripe redirects here with ?session_id=...
 * on successful payment. The actual grant is created by the webhook, so
 * this page just shows a confirmation and points back to the library.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  return (
    <div className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader className="items-center text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
          <CardTitle className="mt-2">Payment received</CardTitle>
          <CardDescription>
            Thanks — your license is being granted now.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-zinc-400">
            It may take a moment for the grant to show up in your library
            while Stripe delivers the webhook. If anything looks off, the
            session id is <code className="text-zinc-300">{sessionId ?? "—"}</code>.
          </p>
          <Link href="/dashboard" className="block">
            <Button className="w-full">Go to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
