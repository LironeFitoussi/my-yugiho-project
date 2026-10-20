import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headings and the brand only (SIL OFL). Body text stays Geist.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "DuelVault", template: "%s · DuelVault" },
  description: "DuelVault — private Yu-Gi-Oh! collection manager",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "DuelVault" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // Matches the dark-first "Shadow Realm" background (oklch(0.16 0.03 285)).
  themeColor: "#0c0b1a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`dark ${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}>
      {/* Extensions (e.g. Grammarly) inject attributes on <body> before hydration; this only silences attribute diffs on this element. */}
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
