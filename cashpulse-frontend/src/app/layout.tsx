import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "CashPulse | AI Working Capital Copilot & 13-Week Treasury Desk",
  description: "Deterministic 13-week direct cash velocity forecasting and AI-assisted working capital remediation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="h-full antialiased">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          {/* eslint-disable-next-line @next/next/no-page-custom-font */}
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          />
        </head>
        <body className="min-h-full bg-[#F1EDE3] text-[#17150F] font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

