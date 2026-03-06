import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { eq } from "drizzle-orm";
import { Toaster } from "@/components/ui/sonner";
import { db, appSettings } from "@/lib/db";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let faviconUrl: string | null = null;
  try {
    const [setting] = await db
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, "favicon_url"))
      .limit(1);
    faviconUrl = setting?.value ?? null;
  } catch {
    // If settings table isn't ready yet, keep default favicon.
  }

  return {
    title: "Em & Me Studio - Influencer Portal",
    description: "Influencer & UGC management portal for Em & Me Studio",
    ...(faviconUrl
      ? {
          icons: {
            icon: [{ url: faviconUrl }],
            shortcut: [faviconUrl],
          },
        }
      : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${geistSans.variable} antialiased`}>
          {children}
          <Toaster richColors position="top-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
