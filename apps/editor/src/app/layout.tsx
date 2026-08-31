import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LadeCompile — Editor",
  description: "Free, no-login HTML/CSS/JS online compiler — editor",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
