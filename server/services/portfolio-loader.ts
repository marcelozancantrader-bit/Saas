import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Carrega o portfólio público de uma org via slug.
 *
 * Rota anônima `/p/[slug]` — sem login. Validamos via service-role:
 *   1. Slug existe? Org tem portfolio_enabled=true?
 *   2. Lista projetos com portfolio_visible=true ordenados por created_at desc.
 *   3. Filtra status='concluido' (foco do portfolio é OBRA ENTREGUE; rascunho
 *      no portfólio dá impressão ruim).
 *
 * Nunca expomos campos sensíveis (e-mail do profissional, dados PIX, etc).
 */

export type PortfolioProjectCard = {
  id: string;
  nome: string;
  tipologia: "residencial" | "comercial" | "reforma" | "outros";
  area_prevista_m2: number | null;
  padrao_construtivo: "popular" | "medio" | "alto" | "luxo" | null;
  endereco_completo: string | null;
  diary_thumbnail_url: string | null;
  created_at: string;
};

export type PortfolioOrg = {
  id: string;
  name: string;
  logo_url: string | null;
  cor_primaria: string | null;
  cnpj: string | null;
  registro_cau: string | null;
  registro_crea: string | null;
  profissional_nome: string | null;
  endereco_completo: string | null;
};

export type PortfolioData = {
  org: PortfolioOrg;
  projects: PortfolioProjectCard[];
};

export type PortfolioLoadResult =
  | { ok: true; data: PortfolioData }
  | { ok: false; reason: "not_found" | "disabled" };

export async function loadPortfolioBySlug(slug: string): Promise<PortfolioLoadResult> {
  const admin = createAdminClient();
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return { ok: false, reason: "not_found" };

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select(
      "id, name, logo_url, cor_primaria, cnpj, registro_cau, registro_crea, profissional_nome, profissional_endereco, portfolio_enabled",
    )
    .ilike("portfolio_slug", normalized)
    .maybeSingle<{
      id: string;
      name: string;
      logo_url: string | null;
      cor_primaria: string | null;
      cnpj: string | null;
      registro_cau: string | null;
      registro_crea: string | null;
      profissional_nome: string | null;
      profissional_endereco: string | null;
      portfolio_enabled: boolean;
    }>();

  if (orgErr || !org) return { ok: false, reason: "not_found" };
  if (!org.portfolio_enabled) return { ok: false, reason: "disabled" };

  const { data: rows } = await admin
    .from("projects")
    .select(
      "id, nome, tipologia, area_prevista_m2, padrao_construtivo, endereco_completo, status, created_at",
    )
    .eq("org_id", org.id)
    .eq("portfolio_visible", true)
    .eq("status", "concluido")
    .order("created_at", { ascending: false })
    .limit(60);

  const baseProjects = (rows ?? []) as Array<{
    id: string;
    nome: string;
    tipologia: PortfolioProjectCard["tipologia"];
    area_prevista_m2: number | null;
    padrao_construtivo: PortfolioProjectCard["padrao_construtivo"];
    endereco_completo: string | null;
    status: string;
    created_at: string;
  }>;

  // Pra cada projeto, tenta pegar a foto mais recente do diário como thumbnail.
  const projects = await Promise.all(
    baseProjects.map(async (p) => {
      const thumb = await loadLatestDiaryPhoto(admin, p.id);
      return {
        id: p.id,
        nome: p.nome,
        tipologia: p.tipologia,
        area_prevista_m2: p.area_prevista_m2,
        padrao_construtivo: p.padrao_construtivo,
        endereco_completo: p.endereco_completo,
        diary_thumbnail_url: thumb,
        created_at: p.created_at,
      };
    }),
  );

  return {
    ok: true,
    data: {
      org: {
        id: org.id,
        name: org.name,
        logo_url: org.logo_url,
        cor_primaria: org.cor_primaria,
        cnpj: org.cnpj,
        registro_cau: org.registro_cau,
        registro_crea: org.registro_crea,
        profissional_nome: org.profissional_nome,
        endereco_completo: org.profissional_endereco,
      },
      projects,
    },
  };
}

type AdminClient = ReturnType<typeof createAdminClient>;

async function loadLatestDiaryPhoto(admin: AdminClient, projectId: string): Promise<string | null> {
  const { data: entries } = await admin
    .from("project_diary_entries")
    .select("photo_paths")
    .eq("project_id", projectId)
    .eq("portal_visible", true)
    .order("registrado_em", { ascending: false })
    .limit(5);

  if (!entries || entries.length === 0) return null;

  for (const e of entries) {
    const paths = (e.photo_paths as string[] | null) ?? [];
    if (paths.length === 0) continue;
    const first = paths[0];
    if (!first) continue;
    const { data: signed } = await admin.storage
      .from("project-files")
      .createSignedUrl(first, 60 * 60 * 24 * 7);
    if (signed?.signedUrl) return signed.signedUrl;
  }
  return null;
}
