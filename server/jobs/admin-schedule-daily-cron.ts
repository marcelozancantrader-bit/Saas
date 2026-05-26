import "server-only";
import { inngest } from "@/lib/inngest/client";
import { publishAdminEvent } from "@/lib/automations/publish";

/**
 * Cron diário 9h BRT que publica `schedule.daily` no engine de automações.
 *
 * Permite Marcelo criar automações tipo "todo dia 9h, envia email com
 * resumo do dia anterior" sem mexer no código.
 */
export const adminScheduleDailyCron = inngest.createFunction(
  {
    id: "admin-schedule-daily-cron",
    name: "Admin: schedule.daily trigger",
    retries: 1,
    triggers: [{ cron: "TZ=America/Sao_Paulo 0 9 * * *" }],
  },
  async ({ step }) => {
    const now = new Date();
    await step.run("publish", async () => {
      await publishAdminEvent("schedule.daily", {
        date: now.toISOString().slice(0, 10),
        timestamp: now.toISOString(),
      });
    });
    return { published: true, date: now.toISOString().slice(0, 10) };
  },
);
