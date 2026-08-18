import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "iBuyNaija — Made in Nigeria marketplace",
  description: "Every item made in Nigeria. Bought with trust. Shop verified Nigerian makers.",
  keywords: "Made in Nigeria, Nigerian marketplace, buy Nigerian products, Adire, Nigerian crafts",
  openGraph: {
    type: "website",
    siteName: "iBuyNaija",
    title: "iBuyNaija — Made in Nigeria marketplace",
    description: "Every item made in Nigeria. Bought with trust.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body suppressHydrationWarning className="min-h-full flex flex-col" style={{ background: '#F7F1E3', color: '#1B2A4A' }}>
        {children}
        <Footer />
      </body>
    </html>
  );
}
