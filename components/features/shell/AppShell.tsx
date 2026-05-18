import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import type { NotificationRow } from "@/server/services/notifications-load";

type Props = {
  children: ReactNode;
  userEmail: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  notifications: NotificationRow[];
};

export function AppShell({ children, userEmail, orgName, role, notifications }: Props) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar orgName={orgName} />
      <div className="flex flex-1 flex-col">
        <TopBar userEmail={userEmail} orgName={orgName} role={role} notifications={notifications} />
        <main className="flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
