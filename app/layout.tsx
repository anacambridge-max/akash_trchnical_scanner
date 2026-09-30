import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Akash Technical Scanner", description: "NIFTY 500 5-minute breakout scanner" };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}