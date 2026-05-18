/**
 * Tier B — regras curadas de zoneamento por cidade.
 *
 * Fontes (V0 — capturado em meados de 2026, REVALIDAR antes de produção):
 *   - Curitiba: Lei Municipal 9.800/2000 (Zoneamento) e suas alterações
 *   - São Paulo: Lei 16.402/2016 (LPUOS) + Plano Diretor Estratégico
 *   - Porto Alegre: LC 434/1999 (PDDUA)
 *   - Rio de Janeiro: LC 198/2018 (Plano Diretor) + Decretos
 *   - Belo Horizonte: LC 11.181/2019 (Plano Diretor) + LUOS
 *
 * V0 cobre apenas as zonas RESIDENCIAIS mais comuns. Não cobre:
 *   - Zonas comerciais/industriais
 *   - ZEIS, APA, áreas históricas
 *   - Exceções de lote de esquina, recuos especiais, etc.
 *
 * Estas regras são pré-validação. SEMPRE checar com a prefeitura antes de
 * aprovar projeto definitivo.
 */

export type ZoneamentoRule = {
  zona: string;
  label: string;
  /** Coeficiente de aproveitamento básico (área construída total / área do terreno) */
  ca_basico: number;
  /** Coeficiente de aproveitamento máximo (com outorga onerosa, quando aplicável) */
  ca_maximo: number | null;
  /** Taxa de ocupação máxima (%) — área projetada do edifício / área do lote */
  to_max_pct: number;
  /** Taxa de permeabilidade mínima do solo (%) */
  permeabilidade_min_pct: number | null;
  /** Altura máxima da edificação em metros (null = sem limite especial) */
  altura_max_m: number | null;
  /** Recuo frontal mínimo em metros */
  recuo_frontal_m: number;
  /** Recuo lateral mínimo em metros (para 1 lateral; quando aplicável) */
  recuo_lateral_m: number | null;
  /** Recuo de fundos mínimo em metros */
  recuo_fundos_m: number | null;
  /** Vagas de estacionamento mínimas por unidade residencial */
  vagas_por_unidade: number;
  /** Nota / contexto da zona */
  nota?: string;
};

export type CidadeData = {
  codigo: string;
  nome: string;
  uf: string;
  lei: string;
  fonte_url?: string;
  zonas: ZoneamentoRule[];
};

export const CIDADES: Record<string, CidadeData> = {
  curitiba: {
    codigo: "curitiba",
    nome: "Curitiba",
    uf: "PR",
    lei: "Lei Municipal 9.800/2000",
    fonte_url: "https://www.curitiba.pr.gov.br/conteudo/zoneamento-e-uso-do-solo/89",
    zonas: [
      {
        zona: "zr-1",
        label: "ZR-1 — Zona Residencial 1 (baixa densidade)",
        ca_basico: 0.5,
        ca_maximo: 1.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 25,
        altura_max_m: 8,
        recuo_frontal_m: 5,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zr-2",
        label: "ZR-2 — Zona Residencial 2 (média-baixa densidade)",
        ca_basico: 1.0,
        ca_maximo: 1.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 25,
        altura_max_m: 8,
        recuo_frontal_m: 5,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zr-3",
        label: "ZR-3 — Zona Residencial 3 (média densidade)",
        ca_basico: 1.5,
        ca_maximo: 2.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 25,
        altura_max_m: null,
        recuo_frontal_m: 5,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 5,
        vagas_por_unidade: 1,
      },
      {
        zona: "zr-4",
        label: "ZR-4 — Zona Residencial 4 (alta densidade)",
        ca_basico: 2.0,
        ca_maximo: 3.5,
        to_max_pct: 50,
        permeabilidade_min_pct: 25,
        altura_max_m: null,
        recuo_frontal_m: 5,
        recuo_lateral_m: 2.5,
        recuo_fundos_m: 5,
        vagas_por_unidade: 1,
      },
    ],
  },

  sao_paulo: {
    codigo: "sao_paulo",
    nome: "São Paulo",
    uf: "SP",
    lei: "Lei 16.402/2016 (LPUOS)",
    fonte_url: "https://gestaourbana.prefeitura.sp.gov.br/",
    zonas: [
      {
        zona: "zer-1",
        label: "ZER-1 — Zona Exclusivamente Residencial 1 (baixa densidade)",
        ca_basico: 1.0,
        ca_maximo: 1.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 25,
        altura_max_m: 10,
        recuo_frontal_m: 5,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zm",
        label: "ZM — Zona Mista (residencial + serviços)",
        ca_basico: 2.0,
        ca_maximo: 2.0,
        to_max_pct: 70,
        permeabilidade_min_pct: 15,
        altura_max_m: 28,
        recuo_frontal_m: 5,
        recuo_lateral_m: null,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zeu",
        label: "ZEU — Zona Eixo de Urbanização (alta densidade — eixos viários)",
        ca_basico: 2.0,
        ca_maximo: 4.0,
        to_max_pct: 70,
        permeabilidade_min_pct: 15,
        altura_max_m: null,
        recuo_frontal_m: 5,
        recuo_lateral_m: null,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
        nota: "ZEU permite outorga onerosa até CA 4. Verificar potencial construtivo do lote.",
      },
      {
        zona: "zc",
        label: "ZC — Zona Central",
        ca_basico: 2.0,
        ca_maximo: 4.0,
        to_max_pct: 75,
        permeabilidade_min_pct: 15,
        altura_max_m: null,
        recuo_frontal_m: 0,
        recuo_lateral_m: null,
        recuo_fundos_m: 3,
        vagas_por_unidade: 0,
        nota: "ZC pode ter recuo frontal zero (alinhamento). Verificar trecho específico.",
      },
    ],
  },

  porto_alegre: {
    codigo: "porto_alegre",
    nome: "Porto Alegre",
    uf: "RS",
    lei: "LC 434/1999 (PDDUA)",
    fonte_url: "https://prefeitura.poa.br/spm/pddua",
    zonas: [
      {
        zona: "mua-1",
        label: "MUA-1 — Macrozona de Uso Adensável 1 (densidade baixa)",
        ca_basico: 1.5,
        ca_maximo: 1.5,
        to_max_pct: 66.66,
        permeabilidade_min_pct: 20,
        altura_max_m: 12.5,
        recuo_frontal_m: 4,
        recuo_lateral_m: null,
        recuo_fundos_m: 4,
        vagas_por_unidade: 1,
      },
      {
        zona: "mua-2",
        label: "MUA-2 — Macrozona de Uso Adensável 2 (densidade média)",
        ca_basico: 2.4,
        ca_maximo: 3.0,
        to_max_pct: 75,
        permeabilidade_min_pct: 20,
        altura_max_m: 18,
        recuo_frontal_m: 4,
        recuo_lateral_m: null,
        recuo_fundos_m: 4,
        vagas_por_unidade: 1,
      },
      {
        zona: "mui",
        label: "MUI — Macrozona Urbana Intensiva",
        ca_basico: 3.0,
        ca_maximo: 4.0,
        to_max_pct: 75,
        permeabilidade_min_pct: 20,
        altura_max_m: null,
        recuo_frontal_m: 4,
        recuo_lateral_m: null,
        recuo_fundos_m: 4,
        vagas_por_unidade: 1,
      },
    ],
  },

  rio_de_janeiro: {
    codigo: "rio_de_janeiro",
    nome: "Rio de Janeiro",
    uf: "RJ",
    lei: "LC 198/2018 (Plano Diretor)",
    fonte_url: "https://www.rio.rj.gov.br/web/smu",
    zonas: [
      {
        zona: "zr-1",
        label: "ZR-1 — Zona Residencial 1 (baixa densidade)",
        ca_basico: 1.0,
        ca_maximo: 1.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 30,
        altura_max_m: 10,
        recuo_frontal_m: 4,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zr-2",
        label: "ZR-2 — Zona Residencial 2 (média densidade)",
        ca_basico: 2.0,
        ca_maximo: 2.5,
        to_max_pct: 60,
        permeabilidade_min_pct: 25,
        altura_max_m: 20,
        recuo_frontal_m: 4,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "zr-3",
        label: "ZR-3 — Zona Residencial 3 (alta densidade)",
        ca_basico: 2.5,
        ca_maximo: 3.5,
        to_max_pct: 60,
        permeabilidade_min_pct: 20,
        altura_max_m: null,
        recuo_frontal_m: 4,
        recuo_lateral_m: 2,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
    ],
  },

  belo_horizonte: {
    codigo: "belo_horizonte",
    nome: "Belo Horizonte",
    uf: "MG",
    lei: "LC 11.181/2019 (Plano Diretor) + LUOS",
    fonte_url: "https://prefeitura.pbh.gov.br/politica-urbana",
    zonas: [
      {
        zona: "oar",
        label: "OAR — Ordenamento Aglomerado Residencial",
        ca_basico: 1.0,
        ca_maximo: 1.0,
        to_max_pct: 50,
        permeabilidade_min_pct: 30,
        altura_max_m: 10,
        recuo_frontal_m: 3,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "ape-1",
        label: "APE-1 — Aglomerado Predominantemente Edificado 1 (média densidade)",
        ca_basico: 1.5,
        ca_maximo: 2.0,
        to_max_pct: 60,
        permeabilidade_min_pct: 20,
        altura_max_m: 22,
        recuo_frontal_m: 3,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
      {
        zona: "ape-2",
        label: "APE-2 — Aglomerado Predominantemente Edificado 2 (alta densidade)",
        ca_basico: 2.0,
        ca_maximo: 2.7,
        to_max_pct: 70,
        permeabilidade_min_pct: 15,
        altura_max_m: null,
        recuo_frontal_m: 3,
        recuo_lateral_m: 1.5,
        recuo_fundos_m: 3,
        vagas_por_unidade: 1,
      },
    ],
  },
};

export const CIDADE_OPTIONS = Object.values(CIDADES).map((c) => ({
  value: c.codigo,
  label: `${c.nome}/${c.uf}`,
}));

export function getCidade(codigo: string | null | undefined): CidadeData | null {
  if (!codigo) return null;
  return CIDADES[codigo] ?? null;
}

export function getZona(
  cidadeCodigo: string | null | undefined,
  zonaCodigo: string | null | undefined,
): ZoneamentoRule | null {
  const cidade = getCidade(cidadeCodigo);
  if (!cidade || !zonaCodigo) return null;
  return cidade.zonas.find((z) => z.zona === zonaCodigo) ?? null;
}
