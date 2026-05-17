import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type Props = {
  children: ReactNode;
  userEmail: string;
  orgName: string;
  role: "owner" | "admin" | "member";
};

export function AppShell({ children, userEmail, orgName, role }: Props) {
  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar orgName={orgName} />
      <div className="flex flex-1 flex-col">
        <TopBar userEmail={userEmail} orgName={orgName} role={role} />
        <main className="flex-1 px-6 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
