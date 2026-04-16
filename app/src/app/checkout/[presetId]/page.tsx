"use client";

/**
 * Checkout entry page. Takes a presetId param, resolves price + grant
 * status via `licenses.priceForCheckout`, and either:
 *   - short-circuits to /p/[id] if the caller already owns it or it's free
 *   - shows a Stripe Checkout button that calls `billing.createCheckoutSession`
 *
 * The actual Stripe flow is server-side: we call the action, it returns a
 * URL, and we redirect. No Stripe JS SDK in the browser.
 */

import { use, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ presetId: string }>;
}) {
  const { presetId } = use(params);
  const presetIdTyped = presetId as Id<"presets">;
  const router = useRouter();
  const quote = useQuery(api.licenses.priceForCheckout, {
    presetId: presetIdTyped,
  });
  const createSession = useAction(api.billing.createCheckoutSession);
  const [busy, setBusy] = useState(false);

  async function goToStripe() {
    setBusy(true);
    try {
      const { url } = await createSession({ presetId: presetIdTyped });
      window.location.href = url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  if (quote === undefined) {
    return (
      <div className="flex h-96 items-center justify-center text-zinc-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!quote) {
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Preset not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!quote.needsCheckout) {
    const reason =
      quote.reason === "author"
        ? "You own this preset."
        : quote.reason === "already-granted"
          ? "You already own a license for this preset."
          : "This preset is free — no checkout required.";
    return (
      <div className="mx-auto max-w-lg p-8">
        <Card>
          <CardHeader>
            <CardTitle>Ready to use</CardTitle>
            <CardDescription>{reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push(`/p/${presetId}`)}>
              Open preset
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const priceUsd = (quote.priceCents / 100).toFixed(2);
  return (
    <div className="mx-auto max-w-lg p-8">
      <Card>
        <CardHeader>
          <CardTitle>Purchase license</CardTitle>
          <CardDescription>
            License: <code>{quote.license}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">
              Price
            </div>
            <div className="mt-1 text-3xl font-semibold text-zinc-50">
              ${priceUsd}
            </div>
          </div>
          {"monetizationEnabled" in quote && !quote.monetizationEnabled ? (
            <div className="rounded-md border border-amber-900/40 bg-amber-950/20 p-3 text-sm text-amber-200">
              Checkout is currently disabled on this deployment. Contact the
              admin to enable monetization.
            </div>
          ) : null}
          <Button
            onClick={goToStripe}
            disabled={
              busy ||
              ("monetizationEnabled" in quote && !quote.monetizationEnabled)
            }
            className="w-full bg-violet-600 hover:bg-violet-500"
          >
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Pay with Stripe
          </Button>
          <p className="text-xs text-zinc-500">
            You will be redirected to Stripe Checkout. On success we
            automatically grant you the license.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
