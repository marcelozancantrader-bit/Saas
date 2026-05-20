import type { ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminTopBar } from "./AdminTopBar";

type Props = {
  children: ReactNode;
  userEmail: string;
};

export function AdminShell({ children, userEmail }: Props) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <AdminSidebar />
      <div className="flex flex-1 flex-col">
        <AdminTopBar userEmail={userEmail} />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
