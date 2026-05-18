/**
 * Debug: fetch /projetos/[id] with an authed cookie and dump the response.
 * Looks for the broken-page symptom that Edge shows as "This page couldn't load".
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2];
  }
}
loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const APP = "https://memorial-ai-mu.vercel.app";

async function main() {
  // Make a throwaway test user
  const admin = createClient(URL, SERVICE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const stamp = Date.now();
  const email = `debug.s4.${stamp}@example.com`;
  const password = "DebugTest123!";
  const { data: created } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { org_name: `OrgDebugS4-${stamp}` },
  });
  if (!created?.user) throw new Error("createUser failed");
  console.log(`Created throwaway user ${created.user.id}`);

  try {
    // Sign in via anon, get access_token + refresh_token
    const anon = createClient(URL, ANON, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: signIn, error: siErr } = await anon.auth.signInWithPassword({ email, password });
    if (siErr || !signIn.session) throw new Error(`signIn: ${siErr?.message}`);

    // Create a project so we have something to open
    const { data: client } = await anon
      .from("clients")
      .insert({
        org_id: (await anon.from("organization_members").select("org_id").limit(1).single()).data!
          .org_id,
        nome: "Debug Cliente",
      })
      .select("id")
      .single();
    const { data: project } = await anon
      .from("projects")
      .insert({
        org_id: (await anon.from("organization_members").select("org_id").limit(1).single()).data!
          .org_id,
        client_id: client!.id,
        nome: "Debug Projeto",
        tipologia: "residencial",
      })
      .select("id")
      .single();
    console.log(`Created throwaway project ${project!.id}`);

    // Build the Supabase auth cookie. @supabase/ssr stores under "sb-<ref>-auth-token".
    const projectRef = URL.replace("https://", "").split(".")[0];
    const cookieName = `sb-${projectRef}-auth-token`;
    const cookiePayload = JSON.stringify([
      signIn.session.access_token,
      signIn.session.refresh_token,
    ]);
    const cookie = `${cookieName}=base64-${Buffer.from(cookiePayload).toString("base64")}`;

    // Fetch the project page
    console.log(`\nFetching ${APP}/projetos/${project!.id} ...`);
    const res = await fetch(`${APP}/projetos/${project!.id}`, {
      headers: { Cookie: cookie, "User-Agent": "debug-script/1.0" },
      redirect: "manual",
    });
    console.log(`Status: ${res.status}`);
    console.log(`Content-Type: ${res.headers.get("content-type")}`);
    console.log(`Content-Length: ${res.headers.get("content-length") ?? "(streamed)"}`);
    console.log(`Location: ${res.headers.get("location") ?? "(none)"}`);

    const body = await res.text();
    console.log(`Body bytes: ${body.length}`);
    // Look for clues
    const errorMarkers = [
      "An error occurred in the Server Components render",
      "An unhandled error",
      'data-nextjs-router="error"',
      "TypeError",
      "ReferenceError",
      "SyntaxError",
      "ENOENT",
      "Internal Server Error",
      "rsc-error",
    ];
    for (const marker of errorMarkers) {
      if (body.includes(marker)) {
        console.log(`  ⚠️  Found "${marker}" in body`);
      }
    }
    // Dump first/last 600 chars
    console.log("\n--- HEAD (first 600) ---");
    console.log(body.slice(0, 600));
    console.log("\n--- TAIL (last 800) ---");
    console.log(body.slice(-800));
  } finally {
    // Cleanup
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    console.log("\nUser deleted.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
