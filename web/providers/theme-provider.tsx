"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes 0.4.6 injects its anti-FOUC bootstrap as an inline script.
// React 19 / Next.js 16 reports that script as a client-render warning even
// though next-themes uses it intentionally during theme initialization.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
