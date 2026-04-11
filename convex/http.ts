import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api } from "./_generated/api";
import { isMonetizationEnabled } from "./licenses";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Stripe webhook receiver (Phase 2 / WS-6). Stripe POSTs JSON + a
 * `stripe-signature` header; we forward both into `billing.onCheckoutCompleted`
 * which verifies the signature and creates the grant. Disabled deployments
 * short-circuit with 200 so Stripe never retries an intentionally inert
 * webhook endpoint.
 */
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (!isMonetizationEnabled()) {
      return new Response("ok", { status: 200 });
    }
    const rawBody = await request.text();
    const sig = request.headers.get("stripe-signature");
    if (!sig) {
      return new Response("Bad request", { status: 400 });
    }
    try {
      await ctx.runAction(api.billing.onCheckoutCompleted, {
        rawBody,
        stripeSignatureHeader: sig,
      });
      return new Response("ok", { status: 200 });
    } catch (err) {
      const message = err instanceof Error ? err.message : "webhook failed";
      // Return 400 on verification failure, 500 on everything else, so
      // Stripe retries the genuinely transient failures.
      const status = message.includes("signature") ? 400 : 500;
      return new Response(message, { status });
    }
  }),
});

export default http;
