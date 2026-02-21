import type { Metadata, Viewport } from "next";
import { Orbitron, Inter } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DOTHAUS - Solana Battle Arena",
  description: "Play, Earn, Dominate. The ultimate elimination arena on Solana.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    title: "DOTHAUS",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#F9FAFB",
};

import { SolanaProvider } from "@/context/SolanaProvider";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.variable} ${inter.variable} antialiased font-sans bg-vaiiya-bg text-vaiiya-indigo overflow-hidden`}
      >
        <ServiceWorkerRegistration />
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
