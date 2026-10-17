import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomeSpace | Shared shopping lists for your AI",
  description: "Manage shared shopping lists across all your spaces with ChatGPT, Claude, and the AI agent you already use.",
  icons: {
    icon: "/homespace-favicon.png",
    shortcut: "/homespace-favicon.png",
    apple: "/homespace-favicon.png"
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
