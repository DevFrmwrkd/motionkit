import type { Metadata } from "next";
import { ConvexClientProvider } from "@/lib/convex";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotionKit — Motion Graphics Workstation",
  description:
    "Browse, customize, and render Remotion motion graphics presets without code.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="h-full font-sans">
        {/* ConvexClientProvider short-circuits for bare routes (e.g.
            /sandbox/*) so the preset runtime iframe doesn't boot a Convex
            client that can't reach the API through a null origin. */}
        <ConvexClientProvider>
          <AppShell>{children}</AppShell>
        </ConvexClientProvider>
        <Toaster theme="dark" position="bottom-right" />
      </body>
    </html>
  );
}
