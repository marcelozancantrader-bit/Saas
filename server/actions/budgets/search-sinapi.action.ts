"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const searchSchema = z.object({
  query: z.string().min(2).max(120),
  uf: z.string().length(2).default("SP"),
  mes_referencia: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .default("2026-05-01"),
  desonerado: z.boolean().default(true),
  limit: z.number().int().positive().max(50).default(20),
});

export type SearchSinapiInput = z.input<typeof searchSchema>;

export type SinapiRow = {
  codigo: string;
  descricao: string;
  unidade: string;
  preco: number;
};

export type SearchSinapiResult = { ok: true; results: SinapiRow[] } | { ok: false; error: string };

export async function searchSinapiAction(raw: SearchSinapiInput): Promise<SearchSinapiResult> {
  const parsed = searchSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Busca inválida." };
  const { query, uf, mes_referencia, desonerado, limit } = parsed.data;

  const supabase = await createClient();
  // If it looks like a SINAPI code, try exact match first; otherwise full-text search.
  const isLikelyCode = /^[\d/]+$/.test(query.trim());

  if (isLikelyCode) {
    const { data, error } = await supabase
      .from("sinapi_compositions")
      .select("codigo, descricao, unidade, preco")
      .eq("uf", uf)
      .eq("mes_referencia", mes_referencia)
      .eq("desonerado", desonerado)
      .like("codigo", `${query.trim()}%`)
      .limit(limit);
    if (error) return { ok: false, error: error.message };
    return {
      ok: true,
      results: (data ?? []).map((r) => ({ ...r, preco: Number(r.preco) })),
    };
  }

  // Full-text search via GIN index on portuguese tsvector(descricao)
  const { data, error } = await supabase
    .from("sinapi_compositions")
    .select("codigo, descricao, unidade, preco")
    .eq("uf", uf)
    .eq("mes_referencia", mes_referencia)
    .eq("desonerado", desonerado)
    .textSearch("descricao", query.trim().split(/\s+/).join(" & "), {
      type: "websearch",
      config: "portuguese",
    })
    .limit(limit);
  if (error) {
    // Fallback to ilike for short queries that confuse websearch
    const { data: fallback, error: fbErr } = await supabase
      .from("sinapi_compositions")
      .select("codigo, descricao, unidade, preco")
      .eq("uf", uf)
      .eq("mes_referencia", mes_referencia)
      .eq("desonerado", desonerado)
      .ilike("descricao", `%${query.trim()}%`)
      .limit(limit);
    if (fbErr) return { ok: false, error: fbErr.message };
    return {
      ok: true,
      results: (fallback ?? []).map((r) => ({ ...r, preco: Number(r.preco) })),
    };
  }
  return {
    ok: true,
    results: (data ?? []).map((r) => ({ ...r, preco: Number(r.preco) })),
  };
}
