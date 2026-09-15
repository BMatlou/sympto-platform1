import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./hydration-card.css";
import { Toaster } from "sonner";

import { cn } from "@/lib/utils";
import AIHealthHelperFab from "@/components/ai-health-helper-fab";
import QueryProvider from "@/providers/query-provider";
import ThemeProvider from "@/providers/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "Sympto",
    template: "%s | Sympto",
  },

  description: "Empowering healthier lives, together.",

  applicationName: "Sympto",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      {
        url: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
    apple: "/apple-touch-icon.png",
  },

  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0B2D54",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("h-full", "antialiased", "font-sans")}
    >
      <body className="min-h-screen bg-background pb-28 text-foreground">
        <ThemeProvider>
          <QueryProvider>
            {children}
            <AIHealthHelperFab />
          </QueryProvider>

          <Toaster
            richColors
            position="top-right"
            closeButton
            duration={4000}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
