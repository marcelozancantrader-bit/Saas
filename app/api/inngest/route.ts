import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processFloorPlan } from "@/server/jobs/process-floor-plan";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processFloorPlan],
});
