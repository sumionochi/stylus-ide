import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Stylus IDE",
  description: "AI-powered Arbitrum Stylus development environment",
};

const systemFontStack =
  "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body style={{ fontFamily: systemFontStack }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
