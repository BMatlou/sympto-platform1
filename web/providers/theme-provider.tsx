"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// next-themes 0.4.6 injects its anti-FOUC bootstrap as an inline script.
// React 19 / Next.js 16 reports that script as a client-render warning even
// though next-themes uses it intentionally during theme initialization.
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const firstArg = args[0];
    const message = typeof firstArg === "string" ? firstArg : "";

    if (
      message.includes("Encountered a script tag while rendering React component") ||
      message.includes("VerifyEachNodeIsAssignedToAnEp") ||
      message.includes("Rerunning with verbose output on a non-minimal build")
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
