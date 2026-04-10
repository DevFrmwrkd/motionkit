import type { Metadata } from "next";
import { ConvexClientProvider } from "@/lib/convex";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "MotionKit — Motion Graphics Workstation",
  description:
    "Browse, customize, and render Remotion motion graphics presets without code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <body className="h-full font-sans">
        <ConvexClientProvider>
          <AppShell>{children}</AppShell>
          <Toaster theme="dark" position="bottom-right" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
