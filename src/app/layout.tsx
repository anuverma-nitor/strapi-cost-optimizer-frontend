import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { SessionProviderWrapper } from "@/components/providers/SessionProviderWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Strapi Admin Clone",
  description: "A Next.js clone of Strapi admin panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProviderWrapper>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}