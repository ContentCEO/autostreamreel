import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgentOS",
  description: "16 specialist agents for marketing + operations.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
