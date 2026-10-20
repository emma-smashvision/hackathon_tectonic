import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "KBC One",
  description: "1 person, 1 app · 1 click away · 1 perfect road to your future. Synthetic demo data only.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#03060d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
