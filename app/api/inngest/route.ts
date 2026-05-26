import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processFloorPlan } from "@/server/jobs/process-floor-plan";
import { importSinapi } from "@/server/jobs/sinapi-import";
import { staleProjectsCron } from "@/server/jobs/stale-projects-cron";
import { expiredCancellationsCron } from "@/server/jobs/expired-cancellations-cron";
import { expiredTrialsCron } from "@/server/jobs/expired-trials-cron";
import { trialReminderCron } from "@/server/jobs/trial-reminder-cron";
import { trialReminderD3Cron } from "@/server/jobs/trial-reminder-d3-cron";
import { adminAutomationRunner } from "@/server/jobs/admin-automation-runner";
import { adminScheduleDailyCron } from "@/server/jobs/admin-schedule-daily-cron";
import { metricThresholdCron } from "@/server/jobs/metric-threshold-cron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processFloorPlan,
    importSinapi,
    staleProjectsCron,
    expiredCancellationsCron,
    expiredTrialsCron,
    trialReminderCron,
    trialReminderD3Cron,
    adminAutomationRunner,
    adminScheduleDailyCron,
    metricThresholdCron,
  ],
});
