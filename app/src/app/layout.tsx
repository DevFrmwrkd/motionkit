import type { Metadata } from "next";
import { ConvexClientProvider } from "@/lib/convex";
import { Toaster } from "@/components/ui/sonner";
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 font-sans">
        <ConvexClientProvider>
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
