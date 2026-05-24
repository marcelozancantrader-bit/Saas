import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { ProjectForm } from "@/components/features/projects/ProjectForm";
import { ProjectBasedOnSelector } from "@/components/features/projects/ProjectBasedOnSelector";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ client_id?: string; based_on?: string }>;
};

type SourceProject = {
  id: string;
  nome: string;
  client_id: string | null;
  tipologia: string;
  padrao_construtivo: string | null;
  endereco_cep: string | null;
  endereco_completo: string | null;
  cidade_codigo: string | null;
  zoneamento: string | null;
  area_terreno_m2: number | null;
};

export default async function NovoProjetoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const sp = await searchParams;

  const [{ data: clients }, { data: existingProjects }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nome")
      .order("nome", { ascending: true })
      .returns<Array<{ id: string; nome: string }>>(),
    supabase
      .from("projects")
      .select("id, nome, tipologia")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Array<{ id: string; nome: string; tipologia: string }>>(),
  ]);

  // Se veio ?based_on=X, busca dados do projeto fonte e usa pra pré-preencher
  let basedOn: SourceProject | null = null;
  if (sp.based_on) {
    const { data } = await supabase
      .from("projects")
      .select(
        "id, nome, client_id, tipologia, padrao_construtivo, endereco_cep, endereco_completo, cidade_codigo, zoneamento, area_terreno_m2",
      )
      .eq("id", sp.based_on)
      .maybeSingle<SourceProject>();
    basedOn = data ?? null;
  }

  // Se veio ?client_id=, valida que o cliente existe na lista do org (sem RLS bypass).
  const preselectedClientId =
    sp.client_id && clients?.some((c) => c.id === sp.client_id)
      ? sp.client_id
      : (basedOn?.client_id ?? null);
  const preselectedClientName = preselectedClientId
    ? (clients?.find((c) => c.id === preselectedClientId)?.nome ?? null)
    : null;

  // Initial form values: priorizar dados do basedOn quando presentes
  const VALID_TIPOLOGIAS = ["residencial", "comercial", "reforma", "outros"] as const;
  const VALID_PADROES = ["popular", "medio", "alto", "luxo"] as const;
  type Tipologia = (typeof VALID_TIPOLOGIAS)[number];
  type Padrao = (typeof VALID_PADROES)[number];

  const initial = basedOn
    ? {
        client_id: preselectedClientId,
        tipologia: (VALID_TIPOLOGIAS as readonly string[]).includes(basedOn.tipologia)
          ? (basedOn.tipologia as Tipologia)
          : undefined,
        padrao_construtivo:
          basedOn.padrao_construtivo &&
          (VALID_PADROES as readonly string[]).includes(basedOn.padrao_construtivo)
            ? (basedOn.padrao_construtivo as Padrao)
            : null,
        endereco_cep: basedOn.endereco_cep ?? "",
        endereco_completo: basedOn.endereco_completo ?? "",
        cidade_codigo: basedOn.cidade_codigo,
        zoneamento: basedOn.zoneamento,
        area_terreno_m2: basedOn.area_terreno_m2,
      }
    : preselectedClientId
      ? { client_id: preselectedClientId }
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projetos"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Projetos
        </Link>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Novo projeto</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Cliente é opcional — você pode vincular depois na aba <b>Visão geral</b> do projeto.
        </p>
      </div>

      {basedOn ? (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-2 p-3 text-sm">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            <span className="text-blue-900 dark:text-blue-100">
              Dados importados de: <strong>{basedOn.nome}</strong>. Ajuste o nome e revise antes de
              salvar.
            </span>
          </CardContent>
        </Card>
      ) : preselectedClientName ? (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20">
          <CardContent className="flex items-center gap-2 p-3 text-sm">
            <span className="text-blue-600 dark:text-blue-400">✓</span>
            <span className="text-blue-900 dark:text-blue-100">
              Cliente pré-selecionado: <strong>{preselectedClientName}</strong>
            </span>
          </CardContent>
        </Card>
      ) : null}

      {!basedOn && (existingProjects ?? []).length > 0 ? (
        <Card>
          <CardContent className="p-4">
            <ProjectBasedOnSelector projects={existingProjects ?? []} />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do projeto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm clients={clients ?? []} initial={initial} />
        </CardContent>
      </Card>
    </div>
  );
}
