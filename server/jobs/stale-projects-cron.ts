import "server-only";
import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Cron diário que detecta:
 *   - Projetos sem atualização há ≥14 dias (status != concluido/arquivado)
 *   - Documentos com status "aguardando_aprovacao" há ≥7 dias
 *
 * Para cada caso, gera uma `notifications` org-wide (user_id null). Para evitar spam,
 * só cria notificação nova se não houver outra do mesmo tipo+entidade nos últimos 14
 * dias (cooldown).
 *
 * Roda 9h da manhã de Brasília todos os dias.
 */
const STALE_PROJECT_DAYS = 14;
const STALE_DOC_DAYS = 7;
const COOLDOWN_DAYS = 14;

export const staleProjectsCron = inngest.createFunction(
  {
    id: "stale-projects-cron",
    name: "Notificar projetos/docs parados",
    retries: 2,
    triggers: [{ cron: "TZ=America/Sao_Paulo 0 9 * * *" }],
  },
  async ({ step, logger }) => {
    const admin = createAdminClient();

    const now = new Date();
    const projectThreshold = new Date(now);
    projectThreshold.setUTCDate(projectThreshold.getUTCDate() - STALE_PROJECT_DAYS);
    const docThreshold = new Date(now);
    docThreshold.setUTCDate(docThreshold.getUTCDate() - STALE_DOC_DAYS);
    const cooldown = new Date(now);
    cooldown.setUTCDate(cooldown.getUTCDate() - COOLDOWN_DAYS);

    // ====== PROJETOS PARADOS ======
    const projectsNotified = await step.run("notify-stale-projects", async () => {
      const { data: stale, error } = await admin
        .from("projects")
        .select("id, org_id, nome, updated_at")
        .lt("updated_at", projectThreshold.toISOString())
        .not("status", "in", "(concluido,arquivado)")
        .limit(500);

      if (error) throw new Error(`Query stale projects: ${error.message}`);
      if (!stale || stale.length === 0) return 0;

      // Carrega ids de projetos já notificados no cooldown — uma query só.
      const ids = stale.map((p) => p.id as string);
      const { data: recent } = await admin
        .from("notifications")
        .select("meta")
        .eq("type", "project.stale")
        .gte("created_at", cooldown.toISOString())
        .in("meta->>project_id", ids);

      const alreadyNotified = new Set<string>(
        (recent ?? [])
          .map((r) => (r.meta as { project_id?: string } | null)?.project_id)
          .filter((v): v is string => !!v),
      );

      const toInsert = stale
        .filter((p) => !alreadyNotified.has(p.id as string))
        .map((p) => {
          const days = Math.floor(
            (now.getTime() - new Date(p.updated_at as string).getTime()) / (1000 * 60 * 60 * 24),
          );
          return {
            org_id: p.org_id as string,
            user_id: null,
            type: "project.stale",
            title: "Projeto parado",
            body: `O projeto "${p.nome}" está sem atualização há ${days} dias.`,
            link_url: `/projetos/${p.id as string}`,
            meta: { project_id: p.id as string, days_stale: days },
          };
        });

      if (toInsert.length === 0) return 0;

      const { error: insertErr } = await admin.from("notifications").insert(toInsert);
      if (insertErr) throw new Error(`Insert stale notifications: ${insertErr.message}`);
      return toInsert.length;
    });

    // ====== DOCUMENTOS AGUARDANDO HÁ MUITO TEMPO ======
    const documentsNotified = await step.run("notify-awaiting-docs", async () => {
      const { data: docs, error } = await admin
        .from("documents")
        .select("id, project_id, titulo, enviado_em, projects!inner(org_id, nome)")
        .eq("status", "aguardando_aprovacao")
        .lt("enviado_em", docThreshold.toISOString())
        .limit(500);

      if (error) throw new Error(`Query awaiting docs: ${error.message}`);
      if (!docs || docs.length === 0) return 0;

      const ids = docs.map((d) => d.id as string);
      const { data: recent } = await admin
        .from("notifications")
        .select("meta")
        .eq("type", "document.awaiting_long")
        .gte("created_at", cooldown.toISOString())
        .in("meta->>document_id", ids);

      const alreadyNotified = new Set<string>(
        (recent ?? [])
          .map((r) => (r.meta as { document_id?: string } | null)?.document_id)
          .filter((v): v is string => !!v),
      );

      const toInsert = docs
        .filter((d) => !alreadyNotified.has(d.id as string))
        .map((d) => {
          const days = Math.floor(
            (now.getTime() - new Date(d.enviado_em as string).getTime()) / (1000 * 60 * 60 * 24),
          );
          const project = d.projects as unknown as { org_id: string; nome: string };
          return {
            org_id: project.org_id,
            user_id: null,
            type: "document.awaiting_long",
            title: "Cliente está demorando para aprovar",
            body: `"${d.titulo}" (projeto ${project.nome}) está aguardando aprovação do cliente há ${days} dias.`,
            link_url: `/projetos/${d.project_id as string}/documentos/${d.id as string}`,
            meta: {
              document_id: d.id as string,
              project_id: d.project_id as string,
              days_awaiting: days,
            },
          };
        });

      if (toInsert.length === 0) return 0;

      const { error: insertErr } = await admin.from("notifications").insert(toInsert);
      if (insertErr) throw new Error(`Insert awaiting doc notifications: ${insertErr.message}`);
      return toInsert.length;
    });

    logger.info(
      `Cron stale: ${projectsNotified} projetos parados + ${documentsNotified} docs aguardando notificados`,
    );

    return { projectsNotified, documentsNotified };
  },
);
