import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processFloorPlan } from "@/server/jobs/process-floor-plan";
import { importSinapi } from "@/server/jobs/sinapi-import";
import { staleProjectsCron } from "@/server/jobs/stale-projects-cron";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processFloorPlan, importSinapi, staleProjectsCron],
});
