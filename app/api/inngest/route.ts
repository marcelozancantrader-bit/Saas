import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processFloorPlan } from "@/server/jobs/process-floor-plan";
import { importSinapi } from "@/server/jobs/sinapi-import";
import { staleProjectsCron } from "@/server/jobs/stale-projects-cron";
import { expiredCancellationsCron } from "@/server/jobs/expired-cancellations-cron";
import { expiredTrialsCron } from "@/server/jobs/expired-trials-cron";
import { trialReminderCron } from "@/server/jobs/trial-reminder-cron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processFloorPlan,
    importSinapi,
    staleProjectsCron,
    expiredCancellationsCron,
    expiredTrialsCron,
    trialReminderCron,
  ],
});
