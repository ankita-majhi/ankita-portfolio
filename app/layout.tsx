import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Ankita — MCA Student & Aspiring Developer", description: "Ankita's portfolio: exploring thoughtful web experiences, software development, and computer applications." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
