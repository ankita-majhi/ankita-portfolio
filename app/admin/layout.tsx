import type { Metadata } from "next";

// Keep the inbox out of search results. It is protected by the token either
// way, but there is no reason for it to be indexed or followed.
export const metadata: Metadata = {
  title: "Inbox — Ankita",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
