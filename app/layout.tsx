import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "n8n Failure Status",
  description: "Internal incident status dashboard for n8n failures"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
