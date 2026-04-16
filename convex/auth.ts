import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Hosts we treat as equivalent to the configured SITE_URL. Keeps the
 * apex ↔ www redirect from tripping the default redirect callback, which
 * requires an exact string match against SITE_URL.
 */
const ALLOWED_HOSTS = new Set([
  "remotion-kit.com",
  "www.remotion-kit.com",
]);

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async redirect({ redirectTo }) {
      const siteUrl = (process.env.SITE_URL ?? "").replace(/\/$/, "");

      // Relative paths — always resolve against the configured SITE_URL.
      if (redirectTo.startsWith("/") || redirectTo.startsWith("?")) {
        return `${siteUrl}${redirectTo}`;
      }

      // Absolute URLs — allow the configured SITE_URL or any host in the
      // allowlist. Normalises to the canonical SITE_URL so cookies stay
      // scoped to one origin post-signin.
      try {
        const parsed = new URL(redirectTo);
        if (redirectTo.startsWith(siteUrl) || ALLOWED_HOSTS.has(parsed.host)) {
          return `${siteUrl}${parsed.pathname}${parsed.search}`;
        }
      } catch {
        // fall through
      }

      throw new Error(
        `Invalid \`redirectTo\` ${redirectTo} for configured SITE_URL: ${siteUrl}`,
      );
    },
  },
});
