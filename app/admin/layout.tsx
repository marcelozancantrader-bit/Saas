import type { ReactNode } from "react";
import type { Metadata } from "next";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { AdminShell } from "@/components/features/admin-shell/AdminShell";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await requirePlatformAdmin();

  return <AdminShell userEmail={me.email}>{children}</AdminShell>;
}
