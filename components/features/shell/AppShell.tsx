import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { CommandPalette } from "./CommandPalette";
import { AnnouncementBanner } from "./AnnouncementBanner";
import type { NotificationRow } from "@/server/services/notifications-load";
import type { ActiveAnnouncement } from "@/server/services/announcements-load";

type Props = {
  children: ReactNode;
  userEmail: string;
  orgName: string;
  role: "owner" | "admin" | "member";
  notifications: NotificationRow[];
  announcements: ActiveAnnouncement[];
  isPlatformAdmin?: boolean;
};

export function AppShell({
  children,
  userEmail,
  orgName,
  role,
  notifications,
  announcements,
  isPlatformAdmin = false,
}: Props) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-50 to-blue-50/30 dark:from-zinc-950 dark:via-zinc-950 dark:to-blue-950/10">
      <Sidebar orgName={orgName} />
      <div className="flex flex-1 flex-col">
        <TopBar userEmail={userEmail} orgName={orgName} role={role} notifications={notifications} />
        <AnnouncementBanner announcements={announcements} />
        <main id="main-content" className="flex-1 px-4 py-5 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <CommandPalette isPlatformAdmin={isPlatformAdmin} />
    </div>
  );
}
