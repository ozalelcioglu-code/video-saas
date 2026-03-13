import type { Metadata, Viewport } from "next";
import "../../styles/global.css";
import { LanguageProvider } from "../provider/LanguageProvider";
import { SessionProvider } from "../provider/SessionProvider";

export const metadata: Metadata = {
  title: "Duble-S Motion AI",
  description: "Professional AI video generation workspace",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background">
        <LanguageProvider>
          <SessionProvider>{children}</SessionProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}