import "server-only";
import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
};

/** Carrega as últimas 30 notifications do usuário/org (RLS filtra por membership). */
export async function loadRecentNotifications(): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link_url, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  return (data ?? []) as NotificationRow[];
}
