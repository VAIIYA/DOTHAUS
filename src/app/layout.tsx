import type { Metadata } from "next";
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
};

import { SolanaProvider } from "@/context/SolanaProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${orbitron.variable} ${inter.variable} antialiased font-sans bg-deep-space text-white overflow-hidden`}
      >
        <SolanaProvider>{children}</SolanaProvider>
      </body>
    </html>
  );
}
