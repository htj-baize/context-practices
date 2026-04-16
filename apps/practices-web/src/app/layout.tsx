import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Context Practices",
  description: "Shared validation shell for context-driven practice cases.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

