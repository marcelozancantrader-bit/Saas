/**
 * Tier A — ART/RRT pré-preenchida.
 *
 * Não substitui o sistema oficial (SISCAU/SISCREA) — gera um PDF de RESUMO
 * que o profissional usa como referência para preencher o sistema oficial,
 * ou anexar como "espelho" no contrato/processo. Os campos refletem os
 * principais blocos comuns ao ART (CREA) e RRT (CAU).
 *
 * Documento legal real: ART (Anotação de Responsabilidade Técnica) é
 * emitida pelo CREA via SISCREA; RRT (Registro de Responsabilidade
 * Técnica) é emitida pelo CAU via SISCAU. Ambos têm número único,
 * código de autenticação e taxa.
 *
 * O que entregamos aqui: um "pré-preenchido" para acelerar o trabalho do
 * profissional, NÃO uma ART/RRT oficial.
 */

export type ArtRrtTipo = "art" | "rrt";

export type ArtRrtData = {
  // tipo do registro
  tipo: ArtRrtTipo;

  // profissional
  profissional_nome: string;
  profissional_registro: string; // formato livre (CAU ou CREA conforme tipo)
  profissional_cpf: string;
  profissional_email: string;
  profissional_endereco: string;

  // organização emitente
  org_nome: string;
  org_cnpj: string;

  // contratante (cliente)
  contratante_nome: string;
  contratante_cpf_cnpj: string;
  contratante_endereco: string;

  // obra
  obra_endereco_completo: string;
  obra_cidade_uf: string;
  obra_tipologia: string;
  obra_area_m2: number | null;
  obra_pavimentos: number | null;
  obra_padrao: string;

  // atividade técnica
  atividade_descricao: string;
  atividade_tipo: "projeto" | "execucao" | "consultoria" | "fiscalizacao";
  data_inicio: string; // YYYY-MM-DD
  data_previsao_termino: string | null;

  // valor
  valor_contrato_brl: number | null;
};

export const ATIVIDADE_TIPO_LABEL: Record<ArtRrtData["atividade_tipo"], string> = {
  projeto: "Projeto técnico",
  execucao: "Execução de obra",
  consultoria: "Consultoria / assessoria técnica",
  fiscalizacao: "Fiscalização de obra",
};

export const TIPO_LABEL: Record<ArtRrtTipo, string> = {
  art: "ART (Anotação de Responsabilidade Técnica — CREA)",
  rrt: "RRT (Registro de Responsabilidade Técnica — CAU)",
};
