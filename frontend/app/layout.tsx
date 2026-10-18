import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "@fontsource-variable/readex-pro";
import "./globals.css";
import { Providers } from "@/components/bank-rag/providers";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: {
    default: "AEGIS-Z",
    template: "%s · AEGIS-Z",
  },
  description:
    "AEGIS-Z: Sovereign AI Security Gateway on IBM LinuxONE with tier-based retrieval, bilingual personal-data masking, and tamper-evident audit trail.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#050c19" },
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme and color-scheme are set by the inline script before paint, so React must not
    // treat them as a hydration mismatch.
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        {/* Sets data-theme from the saved choice (or the system setting) before first paint. */}
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-bg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
