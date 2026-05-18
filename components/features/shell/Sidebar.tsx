import { SidebarContent } from "./SidebarContent";

type Props = { orgName: string };

/** Sidebar desktop (≥md). Mobile usa MobileNav (drawer). */
export function Sidebar({ orgName }: Props) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white md:flex md:flex-col dark:border-zinc-800 dark:bg-zinc-900">
      <SidebarContent orgName={orgName} />
    </aside>
  );
}
