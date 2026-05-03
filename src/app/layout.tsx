import type { Metadata } from "next";
import { Inter } from "next/font/google"; // শুধুমাত্র Inter রাখুন
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/components/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AmarSchool",
  description: "Next.js School Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (

      <html lang="en">
        <body className={inter.className}>
          <AuthProvider>{children}</AuthProvider>
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            theme="light"
          />
          <Script id="sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js');
            }
          `}
        </Script>
        </body>
      </html>
   
  );
}