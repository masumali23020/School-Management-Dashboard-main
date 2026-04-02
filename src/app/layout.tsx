import type { Metadata } from "next";
import { Inter } from "next/font/google"; // শুধুমাত্র Inter রাখুন
import { ClerkProvider } from "@clerk/nextjs";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./globals.css";

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
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <ToastContainer 
            position="top-right"
            autoClose={3000}
            theme="light"
          />
        </body>
      </html>
    </ClerkProvider>
  );
}