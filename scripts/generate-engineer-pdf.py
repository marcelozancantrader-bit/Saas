# -*- coding: utf-8 -*-
"""
Gera PDF profissional descrevendo todas as funcionalidades do Memorial.ai
para envio a engenheiro civil para avaliação técnica.
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, Image, ListFlowable, ListItem
)
from reportlab.platypus.flowables import HRFlowable
from datetime import datetime

# =============================================================================
# Cores da marca Memorial.ai (azul OKLCH hue 252°)
# =============================================================================
COR_PRIMARIA = HexColor("#1d4ed8")   # azul forte
COR_PRIMARIA_CLARO = HexColor("#dbeafe")
COR_TEXTO = HexColor("#0f172a")      # slate-900
COR_TEXTO_SUAVE = HexColor("#475569") # slate-600
COR_FUNDO_BOX = HexColor("#f8fafc")  # slate-50
COR_VERDE = HexColor("#15803d")
COR_BORDA = HexColor("#cbd5e1")

# =============================================================================
# Estilos
# =============================================================================
styles = getSampleStyleSheet()

style_capa_titulo = ParagraphStyle(
    'CapaTitulo',
    parent=styles['Title'],
    fontSize=44,
    leading=52,
    textColor=COR_PRIMARIA,
    alignment=TA_CENTER,
    spaceAfter=8,
    fontName='Helvetica-Bold',
)

style_capa_subtitulo = ParagraphStyle(
    'CapaSubtitulo',
    fontSize=18,
    leading=24,
    textColor=COR_TEXTO,
    alignment=TA_CENTER,
    spaceAfter=20,
    fontName='Helvetica',
)

style_capa_tagline = ParagraphStyle(
    'CapaTagline',
    fontSize=14,
    leading=20,
    textColor=COR_TEXTO_SUAVE,
    alignment=TA_CENTER,
    spaceAfter=8,
    fontName='Helvetica-Oblique',
)

style_capa_info = ParagraphStyle(
    'CapaInfo',
    fontSize=11,
    leading=16,
    textColor=COR_TEXTO_SUAVE,
    alignment=TA_CENTER,
)

style_h1 = ParagraphStyle(
    'H1',
    fontSize=22,
    leading=28,
    textColor=COR_PRIMARIA,
    spaceAfter=12,
    spaceBefore=8,
    fontName='Helvetica-Bold',
)

style_h2 = ParagraphStyle(
    'H2',
    fontSize=16,
    leading=20,
    textColor=COR_PRIMARIA,
    spaceAfter=8,
    spaceBefore=18,
    fontName='Helvetica-Bold',
)

style_h3 = ParagraphStyle(
    'H3',
    fontSize=13,
    leading=17,
    textColor=COR_TEXTO,
    spaceAfter=6,
    spaceBefore=14,
    fontName='Helvetica-Bold',
)

style_body = ParagraphStyle(
    'Body',
    fontSize=10.5,
    leading=15,
    textColor=COR_TEXTO,
    spaceAfter=6,
    alignment=TA_JUSTIFY,
    fontName='Helvetica',
)

style_body_left = ParagraphStyle(
    'BodyLeft',
    parent=style_body,
    alignment=TA_LEFT,
)

style_small = ParagraphStyle(
    'Small',
    fontSize=9,
    leading=12,
    textColor=COR_TEXTO_SUAVE,
    fontName='Helvetica',
)

style_box_label = ParagraphStyle(
    'BoxLabel',
    fontSize=9,
    leading=11,
    textColor=COR_PRIMARIA,
    fontName='Helvetica-Bold',
    spaceAfter=2,
)

style_box_value = ParagraphStyle(
    'BoxValue',
    fontSize=10,
    leading=14,
    textColor=COR_TEXTO,
    fontName='Helvetica',
    spaceAfter=4,
)

style_quote = ParagraphStyle(
    'Quote',
    fontSize=11,
    leading=16,
    textColor=COR_TEXTO,
    fontName='Helvetica-Oblique',
    leftIndent=12,
    rightIndent=12,
    spaceAfter=10,
    spaceBefore=4,
)


def feature_box(titulo, dor, como_funciona, para_engenheiro):
    """Bloco padronizado para descrever uma funcionalidade."""
    elems = []
    elems.append(Paragraph(titulo, style_h3))

    rows = [
        [
            Paragraph("<b>Dor que resolve</b>", style_box_label),
            Paragraph(dor, style_box_value),
        ],
        [
            Paragraph("<b>Como funciona na prática</b>", style_box_label),
            Paragraph(como_funciona, style_box_value),
        ],
        [
            Paragraph("<b>Para o engenheiro civil</b>", style_box_label),
            Paragraph(para_engenheiro, style_box_value),
        ],
    ]
    t = Table(rows, colWidths=[4.4*cm, 11.6*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), COR_FUNDO_BOX),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LINEABOVE', (0, 0), (-1, 0), 0.6, COR_BORDA),
        ('LINEBELOW', (0, -1), (-1, -1), 0.6, COR_BORDA),
        ('LINEBEFORE', (0, 0), (0, -1), 0.6, COR_BORDA),
        ('LINEAFTER', (-1, 0), (-1, -1), 0.6, COR_BORDA),
        ('LINEBELOW', (0, 0), (-1, -2), 0.4, COR_BORDA),
    ]))
    elems.append(KeepTogether(t))
    elems.append(Spacer(1, 12))
    return elems


def header_footer(canvas, doc):
    """Footer com URL e paginação."""
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(COR_TEXTO_SUAVE)
    # rodapé esquerdo
    canvas.drawString(2*cm, 1.5*cm, "Memorial.ai — memorial-ai-mu.vercel.app")
    # rodapé direito (página)
    page_num = canvas.getPageNumber()
    canvas.drawRightString(19*cm, 1.5*cm, f"Página {page_num}")
    # linha fina acima do rodapé
    canvas.setStrokeColor(COR_BORDA)
    canvas.setLineWidth(0.5)
    canvas.line(2*cm, 1.9*cm, 19*cm, 1.9*cm)
    canvas.restoreState()


def cover_page(canvas, doc):
    """Sem header/footer na capa."""
    canvas.saveState()
    # banda colorida superior
    canvas.setFillColor(COR_PRIMARIA)
    canvas.rect(0, A4[1] - 3*cm, A4[0], 3*cm, fill=1, stroke=0)
    canvas.restoreState()


# =============================================================================
# Conteúdo
# =============================================================================
story = []

# ----- CAPA -----
story.append(Spacer(1, 4*cm))
story.append(Paragraph("Memorial.ai", style_capa_titulo))
story.append(Paragraph("Copiloto Documental por IA para Engenharia e Arquitetura", style_capa_subtitulo))
story.append(Spacer(1, 0.5*cm))
story.append(Paragraph(
    '"Da planta ao contrato em horas, não semanas."',
    style_capa_tagline
))
story.append(Spacer(1, 5*cm))

info_capa = [
    ["Documento", "Apresentação técnica de funcionalidades"],
    ["Destinatário", "Engenheiro civil — análise técnica"],
    ["Versão da plataforma", "MVP completo + Tier A + Tier B + Multi-disciplina"],
    ["Aplicação live", "https://memorial-ai-mu.vercel.app"],
    ["Data", datetime.now().strftime("%d/%m/%Y")],
]
t_info = Table(info_capa, colWidths=[5*cm, 11*cm])
t_info.setStyle(TableStyle([
    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
    ('FONTSIZE', (0, 0), (-1, -1), 10),
    ('TEXTCOLOR', (0, 0), (0, -1), COR_PRIMARIA),
    ('TEXTCOLOR', (1, 0), (1, -1), COR_TEXTO),
    ('ROWBACKGROUNDS', (0, 0), (-1, -1), [COR_FUNDO_BOX, white]),
    ('LEFTPADDING', (0, 0), (-1, -1), 12),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
]))
story.append(t_info)
story.append(PageBreak())

# ----- 1. SUMÁRIO EXECUTIVO -----
story.append(Paragraph("1. Sumário Executivo", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

story.append(Paragraph(
    "<b>Memorial.ai</b> é um SaaS B2B desenvolvido para arquitetos e engenheiros civis "
    "brasileiros que atuam em pequenos e médios escritórios — sobretudo o profissional "
    "autônomo ou com equipe enxuta, responsável tanto pela parte técnica quanto pela "
    "burocracia documental do projeto.",
    style_body
))

story.append(Paragraph(
    "A proposta é simples: <b>transformar a planta em todo o pacote técnico-documental "
    "do projeto em poucas horas</b>, em vez das semanas que esse trabalho normalmente "
    "consome no Excel, Word e AutoCAD. A IA é usada onde gera valor real — geração de "
    "documentos, leitura de plantas e extração de dados — e cálculos críticos "
    "(orçamento SINAPI, quantitativos) são deterministicos, sem alucinação possível.",
    style_body
))

story.append(Paragraph(
    "<b>O que a plataforma cobre hoje (em produção):</b>",
    style_h3
))

bullets_cobertura = [
    "Upload de plantas em PDF — arquitetônica e disciplinas complementares (elétrica, hidrossanitária, estrutural, gás, climatização).",
    "Extração estruturada de dados via Claude Sonnet 4 com validação por schema.",
    "Geração de 10 tipos de documento técnico por IA, incluindo memoriais por disciplina, PPCI, impermeabilização, contrato, proposta e cronograma.",
    "Orçamento SINAPI automatizado com breakdown por disciplina (arquitetônico + elétrico + hidráulico + estrutural), BDI e curva ABC.",
    "Validação automática de NBR (12.722, 15.575) e zoneamento por cidade (5 capitais curadas: Curitiba, São Paulo, Porto Alegre, Rio de Janeiro, Belo Horizonte).",
    "ART/RRT pré-preenchida com dados do projeto e do profissional.",
    "Portal do cliente com aprovação por assinatura digital (canvas) + registro de IP, timestamp e hash do documento — prova legal LGPD-compliant.",
    "Fluxo formal de alteração de escopo: cliente solicita → profissional precifica → cliente assina aditivo.",
    "Conformidade LGPD completa (export, delete, base legal documentada).",
    "Billing via PIX (Asaas), planos a partir de R$ 149/mês.",
]
story.append(ListFlowable(
    [ListItem(Paragraph(b, style_body), leftIndent=10) for b in bullets_cobertura],
    bulletType='bullet',
    leftIndent=12,
    bulletColor=COR_PRIMARIA,
))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "<b>Stack:</b> Next.js 15 (RSC) + Supabase (Postgres 16 + RLS) + Anthropic Claude "
    "Sonnet 4.6 + Inngest + Vercel. Multi-tenant com Row Level Security em todas as tabelas.",
    style_body
))

story.append(PageBreak())

# ----- 2. DORES QUE O PRODUTO RESOLVE -----
story.append(Paragraph("2. Dores que o Memorial.ai resolve", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

story.append(Paragraph(
    "Cada funcionalidade foi mapeada para uma dor específica e quantificável "
    "do profissional autônomo brasileiro. A lista abaixo é resultado de pesquisa "
    "com escritórios pequenos (1-5 pessoas), que respondem pela maioria do mercado "
    "de arquitetura e engenharia no Brasil.",
    style_body
))

story.append(Spacer(1, 8))

dores_data = [
    ["#", "Dor frequente do profissional", "Tempo perdido", "Solução Memorial.ai"],
    ["1", "Orçamento SINAPI manual no Excel", "1 semana", "Auto em < 2 min via planta"],
    ["2", "Cliente pede alteração e ninguém cobra aditivo", "5-15% do contrato", "Portal com aditivo formal"],
    ["3", "Memorial descritivo copiado do projeto anterior", "8-16h", "Gerado por IA via NBR"],
    ["4", "Proposta comercial sem padronização", "4-8h", "Template + IA + branding"],
    ["5", "Contrato genérico baixado da internet", "Risco jurídico", "Cláusulas de proteção via IA"],
    ["6", "ART/RRT preenchimento manual", "1-2h por projeto", "Pré-preenchida automática"],
    ["7", "Briefing com cliente é informal", "Retrabalho infinito", "Formulário digital → projeto"],
    ["8", "Cliente aprova por WhatsApp e depois nega", "Prejuízo + desgaste", "Assinatura digital + hash + IP"],
    ["9", "Cálculo de carga elétrica/quantitativo hidráulico manual", "4-8h por disciplina", "Extração por IA + SINAPI"],
    ["10", "Não tem visibilidade do que está parado no escritório", "Projetos atrasam", "Dashboard com KPIs ativos"],
]

t_dores = Table(dores_data, colWidths=[1*cm, 7.5*cm, 3*cm, 5.5*cm])
t_dores.setStyle(TableStyle([
    # cabeçalho
    ('BACKGROUND', (0, 0), (-1, 0), COR_PRIMARIA),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('ALIGN', (0, 0), (-1, 0), 'LEFT'),
    # corpo
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('TEXTCOLOR', (0, 1), (-1, -1), COR_TEXTO),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, COR_FUNDO_BOX]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ALIGN', (0, 0), (0, -1), 'CENTER'),
    ('ALIGN', (2, 1), (2, -1), 'CENTER'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
]))
story.append(t_dores)

story.append(Spacer(1, 12))
story.append(Paragraph(
    "<b>Estimativa conservadora:</b> um engenheiro civil que atende 12 projetos/ano "
    "economiza entre <b>20 e 40 horas por mês</b> usando a plataforma — tempo que pode "
    "ser realocado para projetos faturáveis ou novos clientes.",
    style_quote
))

story.append(PageBreak())

# ----- 3. FUNCIONALIDADES -----
story.append(Paragraph("3. Funcionalidades em detalhe", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

story.append(Paragraph(
    "A seguir, cada funcionalidade está descrita com três campos: a dor específica "
    "que resolve, como o fluxo funciona na prática (passo a passo) e o benefício "
    "concreto para o profissional de engenharia civil.",
    style_body
))
story.append(Spacer(1, 10))

# ===== A. CADASTRO E ESTRUTURA =====
story.append(Paragraph("A. Cadastro do escritório e do projeto", style_h2))

for elem in feature_box(
    "A.1 — Autenticação e espaço de trabalho multi-tenant",
    "Profissional não quer mais uma conta para gerenciar; quer entrar e trabalhar.",
    "Cadastro via e-mail/senha ou Google OAuth. Cada conta cria automaticamente uma "
    "organização (workspace) com isolamento total via Row Level Security do PostgreSQL. "
    "Permite convidar membros da equipe (1 no Free, 1 no Pro, 5 no Studio). Configurações "
    "da organização: CNPJ, registro CAU/CREA, logo, BDI padrão, dados de PIX, cores da "
    "identidade visual.",
    "Garantia técnica de que os dados do seu escritório não vazam para outro: cada "
    "consulta ao banco é filtrada automaticamente por organização no nível de SQL — não "
    "é apenas regra de aplicação. Adequado para guardar projetos confidenciais de clientes."
):
    story.append(elem)

for elem in feature_box(
    "A.2 — CRUD de projetos e clientes",
    "Informação espalhada entre planilhas, WhatsApp e pastas no Drive.",
    "Cadastro de projetos com nome, cliente vinculado, endereço (preenchimento automático "
    "via CEP através do ViaCEP), tipologia (residencial / comercial / reforma / outros), "
    "área prevista, padrão construtivo, status (rascunho → em andamento → aguardando cliente "
    "→ concluído). Cadastro de clientes com validação algorítmica de CPF/CNPJ, e-mail, "
    "telefone, endereço completo. Filtros por status e tipologia, busca textual.",
    "Cada projeto vira o nó central que reúne planta, extrações, documentos, orçamento, "
    "contrato e aprovações — substitui a pasta no Drive e o caderno de anotações."
):
    story.append(elem)

for elem in feature_box(
    "A.3 — Demo em 1 clique",
    "Demonstrar para cliente ou avaliar a ferramenta toma tempo de cadastro.",
    "Botão no dashboard cria um projeto fictício completo em 5 segundos: cliente "
    "cadastrado, planta de exemplo enviada, dados extraídos, contrato gerado. Tudo pronto "
    "para passear pelas funcionalidades.",
    "Permite mostrar a plataforma para sócios, estagiários ou para um cliente em uma "
    "reunião sem precisar configurar nada."
):
    story.append(elem)

story.append(PageBreak())

# ===== B. ANÁLISE DA PLANTA POR IA =====
story.append(Paragraph("B. Análise da planta por IA (multi-disciplina)", style_h2))

for elem in feature_box(
    "B.1 — Extração da planta arquitetônica",
    "Levantar área, ambientes e elementos especiais para alimentar orçamento e memoriais leva 2-4 horas.",
    "Upload do PDF da planta arquitetônica (até 50 MB). A IA (Claude Sonnet 4.6 com visão "
    "nativa) lê o PDF e retorna em ~60 segundos um JSON estruturado: área total construída, "
    "área do terreno, lista completa de ambientes (nome + área em m² + tipo: sala/quarto/"
    "cozinha/banheiro/etc), número de pavimentos, tipologia inferida, padrão construtivo "
    "(popular/médio/alto/luxo), e elementos especiais (piscina, churrasqueira, sacada, "
    "garagem, jardim, área de serviço externa). Tudo passa por validação Zod — se faltar "
    "campo ou tipo divergir, falha explícita.",
    "Você ganha 2-4 horas por projeto apenas no levantamento. A extração tem confiança "
    "marcada (alta/média/baixa) e você revisa/edita antes de confirmar. Custo aproximado: "
    "US$ 0,02 por planta processada."
):
    story.append(elem)

for elem in feature_box(
    "B.2 — Extração de projetos complementares (5 disciplinas)",
    "Memorial elétrico, hidráulico ou estrutural exige releitura da planta específica.",
    "Mesma interface, mas escolhendo a disciplina no upload: elétrico, hidrossanitário, "
    "estrutural, gás ou climatização (HVAC). Para cada uma, há um prompt especializado:"
    "<br/>"
    "• <b>Elétrico:</b> tomadas, interruptores, luminárias, circuitos, bitolas, quadro de "
    "distribuição, presença de DR/DPS.<br/>"
    "• <b>Hidrossanitário:</b> pontos de água fria/quente/esgoto por ambiente, ralos, "
    "capacidade do reservatório, fossa séptica/sumidouro, comprimento estimado de PVC "
    "25/32/100mm.<br/>"
    "• <b>Estrutural:</b> sistema (concreto/alvenaria estrutural/metálica), fundação, fck, "
    "pilares, vigas, lajes, volume estimado de concreto e massa de aço CA-50.<br/>"
    "• <b>Gás:</b> tipo (GLP/GN), pontos de consumo, tubulação cobre, registros, central GLP.<br/>"
    "• <b>HVAC:</b> sistema (split, cassete, VRF, dutado), splits por ambiente com BTU, "
    "exaustão mecânica, dutos.",
    "Para cada disciplina você obtém um resumo com os números essenciais antes de revisar. "
    "Confirmando, esses dados alimentam diretamente o orçamento SINAPI específico da "
    "disciplina e podem ser usados nos memoriais técnicos."
):
    story.append(elem)

story.append(PageBreak())

# ===== C. DOCUMENTOS POR IA =====
story.append(Paragraph("C. Geração de documentos técnicos por IA", style_h2))

story.append(Paragraph(
    "<b>10 tipos de documento</b> gerados automaticamente a partir dos dados do projeto, "
    "todos editáveis em rich text (Tiptap) antes da exportação. Cada documento sai em PDF "
    "com a identidade visual do escritório (logo, cores, dados de contato) e tem disclaimer "
    "obrigatório de revisão técnica humana no rodapé.",
    style_body
))
story.append(Spacer(1, 8))

docs_table = [
    ["Documento", "Base normativa", "O que contém"],
    ["Memorial descritivo arquitetônico", "NBR 12.722, 15.575", "Descrição de todos os sistemas construtivos do projeto"],
    ["Memorial estrutural", "NBR 6118, 6122", "Sistema estrutural, fundação, fck, taxa de aço"],
    ["Memorial hidrossanitário", "NBR 5626, 8160", "Água fria, água quente, esgoto, ventilação"],
    ["Memorial elétrico", "NBR 5410", "Circuitos, quadros, aterramento, proteções"],
    ["Memorial de PPCI", "NBR 9077, IT do CBM", "Saídas, hidrantes, extintores, sinalização"],
    ["Memorial de impermeabilização", "NBR 9575", "Sistemas por área (laje, baldrame, banheiros)"],
    ["Caderno de especificações", "—", "Material por sistema com referências de mercado"],
    ["Proposta comercial", "—", "Escopo, prazos, etapas, cláusula de aditivo"],
    ["Contrato de prestação", "Código Civil", "Cláusulas de revisão, PI, responsabilidades"],
    ["Cronograma físico-financeiro", "—", "Etapas com prazos e desembolsos"],
]
t_docs = Table(docs_table, colWidths=[5.5*cm, 4.5*cm, 7*cm])
t_docs.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COR_PRIMARIA),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, COR_FUNDO_BOX]),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
]))
story.append(t_docs)

story.append(Spacer(1, 12))

for elem in feature_box(
    "C.1 — Geração e edição",
    "Memorial e caderno copiados do projeto anterior, com inconsistências.",
    "Cada documento é gerado em ~30-90 segundos a partir dos dados extraídos da planta + "
    "dados do briefing do cliente + dados da organização. Sai já formatado, com seções "
    "definidas, no editor Tiptap. Você revisa, ajusta o que for necessário e exporta em "
    "PDF. Todo histórico de versões fica armazenado.",
    "Memorial descritivo de uma residência de 150 m² fica pronto em 10-15 minutos "
    "(incluindo revisão), contra 8-16 horas no Word."
):
    story.append(elem)

for elem in feature_box(
    "C.2 — Marca d'água e branding",
    "Documento parece amador, perde credibilidade.",
    "Plano Free aplica marca d'água \"RASCUNHO\" no PDF até o documento ser finalizado. "
    "Planos pagos aplicam logo do escritório, cores corporativas, dados de contato no "
    "cabeçalho/rodapé. Open Graph dinâmico para compartilhamento.",
    "Documentação técnica entregue ao cliente tem a cara do seu escritório, não a do SaaS."
):
    story.append(elem)

for elem in feature_box(
    "C.3 — Versionamento e rastreabilidade",
    "\"Qual versão do memorial eu mandei pro cliente mês passado?\"",
    "Cada salvamento cria nova versão do documento. Histórico completo visível, com data, "
    "autor e custo de tokens da IA naquela geração. Versão aprovada pelo cliente fica "
    "marcada com hash SHA-256 imutável.",
    "Em caso de disputa, você tem prova técnica de qual conteúdo foi entregue, quando e "
    "quem aprovou."
):
    story.append(elem)

story.append(PageBreak())

# ===== D. ORÇAMENTO =====
story.append(Paragraph("D. Orçamento SINAPI automatizado", style_h2))

for elem in feature_box(
    "D.1 — Geração do orçamento arquitetônico",
    "Montar orçamento SINAPI no Excel toma 1 semana e tem erro de quantitativo.",
    "A partir da extração confirmada da planta, regras heurísticas determinísticas "
    "(versionadas em <i>lib/budget/rules/v1.ts</i>) calculam quantitativos por sistema: "
    "fundação, alvenaria, cobertura, esquadrias, pisos, revestimentos, pintura, "
    "instalações elétricas e hidráulicas básicas, louças e metais. Cada item busca o preço "
    "atual no banco SINAPI (UF + mês de referência + desonerado/não-desonerado). BDI "
    "configurável. Curva ABC automática.",
    "Casa de 120 m² gera orçamento de ~29 itens, R$ 193 mil, em menos de 1 segundo. "
    "Margem de erro contra orçamento manual: tipicamente abaixo de 20%."
):
    story.append(elem)

for elem in feature_box(
    "D.2 — Orçamento por disciplina + breakdown",
    "Cliente pergunta \"quanto custa só a parte elétrica?\" e você precisa abrir o Excel inteiro.",
    "Cada disciplina complementar (elétrico, hidráulico, estrutural) confirmada acrescenta "
    "seus próprios itens ao orçamento, taggeados com a disciplina. A tela do orçamento "
    "mostra: tabela agrupada com cabeçalho por disciplina + card \"Total por disciplina\" "
    "com bruto, total com BDI e percentual de cada uma + linha de total consolidado. Gás "
    "e HVAC, que não têm composições SINAPI diretas, recebem preço de referência de mercado.",
    "Você consegue responder \"a elétrica é 12% do orçamento\" em segundos. Pode também "
    "exportar o orçamento separado por disciplina para licitar com fornecedores diferentes."
):
    story.append(elem)

for elem in feature_box(
    "D.3 — Edição e ajuste manual",
    "Regras automáticas nunca cobrem 100% dos casos específicos.",
    "Cada linha do orçamento é editável inline: você muda quantidade, preço unitário ou "
    "remove o item. Há também busca em todo o banco SINAPI para adicionar manualmente "
    "qualquer composição. Recálculo de totais e BDI em tempo real.",
    "Mantém o controle final sobre o orçamento — a IA e as regras são partida, não chegada."
):
    story.append(elem)

for elem in feature_box(
    "D.4 — Exportação Excel e PDF",
    "Cliente pede em Excel pra cotar com construtora, exige PDF pra anexar no contrato.",
    "Botões de exportação geram Excel (com fórmulas mantidas) e PDF (com identidade do "
    "escritório, capa, totais por disciplina e curva ABC) em < 3 segundos.",
    "Sai pronto para anexar à proposta ou enviar para construtora cotar."
):
    story.append(elem)

story.append(PageBreak())

# ===== E. VALIDAÇÃO TÉCNICA =====
story.append(Paragraph("E. Validação técnica automatizada", style_h2))

for elem in feature_box(
    "E.1 — Verificação de conformidade NBR",
    "Esquecer pé-direito mínimo, ventilação ou área mínima de quarto e descobrir em obra.",
    "Após confirmar a extração da planta, o sistema roda verificações heurísticas (sem IA, "
    "100% determinísticas) contra a NBR 15.575 (desempenho) e NBR 12.722 (terminologia): "
    "pé-direito mínimo por tipo de ambiente, áreas mínimas de quartos/cozinhas/banheiros, "
    "presença de ambientes obrigatórios. Cada não-conformidade gera um alerta com "
    "referência à norma e ao ambiente específico.",
    "Funciona como um checklist automatizado de fim de projeto — pega esquecimentos "
    "comuns antes do projeto ir para o cliente ou para a prefeitura."
):
    story.append(elem)

for elem in feature_box(
    "E.2 — Zoneamento por cidade",
    "Cada uma das 5.570 cidades brasileiras tem código de obras próprio.",
    "5 capitais curadas no MVP: Curitiba, São Paulo, Porto Alegre, Rio de Janeiro e Belo "
    "Horizonte — 17 zonas residenciais cobertas. Você seleciona cidade + zona + informa "
    "área do terreno, e o sistema valida: coeficiente de aproveitamento (CA), taxa de "
    "ocupação (TO), altura máxima, número mínimo de vagas. Recuos e permeabilidade "
    "ficam como advertência (não dá para inferir da extração apenas).",
    "Permite saber se o projeto cabe na zona antes mesmo de protocolar na prefeitura. "
    "Reduz retrabalho por reprovação por excesso de área ou altura."
):
    story.append(elem)

for elem in feature_box(
    "E.3 — ART/RRT pré-preenchida",
    "Preencher campos de ART/RRT a cada projeto consome 1-2 horas e induz erro de digitação.",
    "Card no projeto puxa dados de: organização (nome, CNPJ, registros CAU/CREA), cliente "
    "(nome, CPF/CNPJ, endereço completo), obra (endereço, tipologia, área, padrão). Você "
    "completa apenas dados financeiros (valor do contrato) e datas. Exportação direta para "
    "PDF de envio.",
    "Reduz a ART/RRT a um trabalho de revisão de 5 minutos. Diminui o risco de erro de "
    "digitação que invalida o registro junto ao Conselho."
):
    story.append(elem)

story.append(PageBreak())

# ===== F. PORTAL DO CLIENTE =====
story.append(Paragraph("F. Portal do cliente (diferencial)", style_h2))

story.append(Paragraph(
    "<b>É a feature mais importante do produto.</b> Resolve a maior dor financeira do "
    "profissional: cliente que aprova alteração de escopo pelo WhatsApp e depois nega ter "
    "aprovado, ou pede mudança \"de favor\" sem aditivo. Aqui, toda interação fica "
    "registrada com prova legal.",
    style_body
))
story.append(Spacer(1, 8))

for elem in feature_box(
    "F.1 — Acesso por token sem login",
    "Cliente não quer criar mais uma conta para acompanhar projeto.",
    "Cada cliente cadastrado ganha um <code>portal_token</code> único (UUID). URL pública "
    "única: <i>memorial-ai-mu.vercel.app/portal/{token}</i>. Sem login, sem app. Cliente "
    "abre no celular ou desktop e vê tudo. O token é o segredo, então só quem você enviou "
    "o link consegue acessar.",
    "Reduz fricção a zero. Cliente abre o link de 70 anos consegue assinar pelo iPhone."
):
    story.append(elem)

for elem in feature_box(
    "F.2 — Aprovação com assinatura digital + prova legal",
    "WhatsApp não tem valor probatório de aprovação.",
    "Cliente abre o documento, lê em rich text, marca checkbox de termos e <b>assina "
    "desenhando no canvas</b> (funciona em touch e mouse). No envio, o sistema registra: "
    "timestamp UTC, IP de origem, user-agent, hash SHA-256 do documento aprovado e a "
    "assinatura como imagem PNG anexada. Tudo persistido em <i>audit_log</i> imutável.",
    "Em juízo, você tem: 1) o documento exato que foi aprovado (verificável via hash), "
    "2) quem aprovou (IP + timestamp), 3) a assinatura como imagem. Conforme MP 2.200-2/2001, "
    "art. 10 §2º — assinatura eletrônica simples + meio de comprovação de autoria = válida."
):
    story.append(elem)

for elem in feature_box(
    "F.3 — Fluxo formal de alteração de escopo",
    "Cliente pede \"só uma janelinha a mais\" e aceita só pra entregar; depois o cliente fala que aquilo \"já estava no projeto\".",
    "Cliente abre o portal e clica em \"Solicitar alteração\". Descreve a mudança e marca "
    "urgência (baixa/média/alta). Você recebe notificação in-app, define: valor do "
    "aditivo (R$ ou %) e prazo adicional em dias. Cliente recebe a \"ordem de serviço de "
    "alteração\" e assina pelo mesmo canvas. O aditivo entra como <i>scope_change</i> no "
    "projeto, soma ao total do contrato e fica visível no orçamento.",
    "Profissionaliza a relação. O cliente passa a entender que toda mudança tem custo e "
    "prazo formalizados. Recupera 5-15% do contrato em projetos onde alterações "
    "anteriormente eram absorvidas."
):
    story.append(elem)

for elem in feature_box(
    "F.4 — Briefing inteligente do cliente",
    "Briefing por WhatsApp é confuso; depois o cliente diz que pediu coisa diferente.",
    "Formulário digital adaptativo: você envia link, cliente preenche programa (quantos "
    "quartos, banheiros, escritório, área gourmet etc), padrão desejado, referências "
    "visuais. Sistema gera resumo formal que vira a base do projeto e dos memoriais.",
    "Briefing fica em documento, com data e cliente assinando \"li e estou de acordo\" — "
    "ou abre alteração de escopo formal depois."
):
    story.append(elem)

for elem in feature_box(
    "F.5 — Chat da planta (Q&A para o cliente)",
    "Cliente quer saber se a janela do quarto dela é maior que a do filho.",
    "Bot dentro do portal: cliente faz perguntas em texto natural sobre o próprio projeto "
    "(\"qual a área da sala?\", \"qual o pé-direito?\"). Roda em Claude Haiku 4.5 (rápido "
    "e barato), usando como contexto a extração confirmada da planta. Custo de US$ 0,001 "
    "a US$ 0,005 por pergunta.",
    "Cliente para de te perguntar coisas óbvias por WhatsApp. Você ganha foco; cliente "
    "ganha autonomia."
):
    story.append(elem)

story.append(PageBreak())

# ===== G. GESTÃO E CONFORMIDADE =====
story.append(Paragraph("G. Gestão do escritório e conformidade legal", style_h2))

for elem in feature_box(
    "G.1 — Dashboard com KPIs do escritório",
    "Difícil saber o que está parado ou onde está o dinheiro.",
    "Página inicial mostra 6 KPIs sempre atualizados: projetos ativos (vs limite do plano), "
    "faturamento previsto (soma dos valores de contrato dos projetos com documento aprovado), "
    "documentos aguardando aprovação do cliente, alterações de escopo pendentes, ciclo médio "
    "em dias (projeto criado → primeira aprovação), projetos parados há 14+ dias. "
    "Cards de uso vs limites com indicador verde (< 80%) → amarelo (80-99%) → vermelho (100%).",
    "Visão executiva instantânea. Você sabe onde está o gargalo: cliente atrasando "
    "aprovação? Equipe parada? Limite do plano chegando? Resposta em uma olhada."
):
    story.append(elem)

for elem in feature_box(
    "G.2 — Notificações in-app + e-mail",
    "Cliente aprovou ontem mas você só vai ver semana que vem.",
    "Sino no topbar mostra contador de notificações não lidas. Eventos notificados: cliente "
    "aprovou/rejeitou documento, cliente solicitou alteração de escopo, alteração aprovada/"
    "rejeitada pelo cliente, plano atualizado, projeto sem movimento. E-mail transacional "
    "via Resend para os mesmos eventos (opcional).",
    "Ciclo de aprovação acelera. Cliente nunca \"esquece\" que ainda precisa aprovar."
):
    story.append(elem)

for elem in feature_box(
    "G.3 — Cobrança via PIX (Asaas)",
    "Receber via boleto/cartão tem fricção e fees altos.",
    "Integração nativa com Asaas (gateway brasileiro). Upgrade dentro do app gera "
    "subscription via PIX. Webhook do Asaas atualiza o plano em tempo real. Faturas em "
    "PDF baixáveis. Suporta também boleto e cartão para clientes corporativos.",
    "Pagamento por PIX cai imediato; sem taxas de cartão; sem retorno de boleto. "
    "Fluxo de caixa estável."
):
    story.append(elem)

for elem in feature_box(
    "G.4 — Conformidade LGPD completa",
    "Multa por LGPD pode ir até 2% do faturamento; e cliente exige tratamento de dados.",
    "Página /privacidade com 9 seções explicando bases legais (consentimento + execução de "
    "contrato), direitos do titular (art. 18), retenção, DPO, segurança. Página /termos com "
    "12 seções (responsabilidade técnica, assinatura eletrônica MP 2.200-2, planos, foro). "
    "API <i>/api/lgpd/export</i> entrega ZIP com todos os dados do usuário em JSON. Botão "
    "\"Deletar minha conta\" exige digitação \"DELETAR MINHA CONTA\" e remove tudo em "
    "cascata. Audit log imutável de toda operação relevante.",
    "Profissional fica em conformidade sem trabalho. Se cliente pedir export de dados, "
    "um clique. Risco de processo regulatório reduzido a praticamente zero."
):
    story.append(elem)

story.append(PageBreak())

# ----- 4. DIFERENCIAIS VS CONCORRÊNCIA -----
story.append(Paragraph("4. Diferenciais frente à concorrência", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

concorrentes = [
    ["Concorrente", "Foco principal", "Lacuna preenchida pelo Memorial.ai"],
    ["Sienge", "ERP para construtoras", "Caro, complexo, exige semanas de implantação"],
    ["Vobi", "Gestão de projetos AEC", "Generalista — não automatiza documentação técnico-regulatória profunda"],
    ["Obra Prima", "Gestão básica para PME", "Sem IA real para gerar memoriais e contratos"],
    ["OrçaFascio / i9", "Orçamento SINAPI", "Apenas orçamento; sem memorial, contrato, portal cliente"],
    ["BIM 360", "Compatibilização BIM", "Exige Revit, custa caro, inadequado para pequeno escritório"],
    ["Forecast", "OCR de plantas + orçamento", "Sem documentação regulatória (memoriais, ART/RRT)"],
]
t_conc = Table(concorrentes, colWidths=[3.5*cm, 5*cm, 8.5*cm])
t_conc.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COR_PRIMARIA),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, COR_FUNDO_BOX]),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
]))
story.append(t_conc)

story.append(Spacer(1, 14))
story.append(Paragraph(
    "<b>Posicionamento único:</b> o Memorial.ai é o único produto que cobre, em uma "
    "única plataforma, o fluxo completo: <b>planta → extração → memorial → orçamento → "
    "validação NBR → ART/RRT → contrato → portal de aprovação</b>. Concorrentes cobrem "
    "fatias dessa cadeia; nenhum cobre tudo.",
    style_body
))

story.append(PageBreak())

# ----- 5. PLANOS E PREÇOS -----
story.append(Paragraph("5. Planos e preços", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

planos = [
    ["", "Free", "Standard", "Pro", "Pro Max", "Agência"],
    ["Preço/mês", "R$ 0", "R$ 199,90", "R$ 449,90", "R$ 699,90", "Consultar"],
    ["Projetos ativos", "2", "10", "Ilimitado", "Ilimitado", "Ilimitado"],
    ["Docs IA / mês", "3", "30", "100", "300", "Ilimitado"],
    ["Usuários no escritório", "1", "1", "3", "10", "Ilimitado"],
    ["Marca d'água nos PDFs", "Sim", "Não", "Não", "Não", "Não"],
    ["Portal do cliente", "—", "Sim", "Sim", "Sim", "Sim"],
    ["Branding completo (logo+cor)", "—", "Sim", "Sim", "Sim", "Sim"],
    ["Multi-disciplina (elétrica, etc)", "Sim", "Sim", "Sim", "Sim", "Sim"],
    ["Análise NBR + Zoneamento", "Sim", "Sim", "Sim", "Sim", "Sim"],
    ["ART/RRT pré-preenchida", "Sim", "Sim", "Sim", "Sim", "Sim"],
    ["Chat da planta (cliente)", "—", "Sim", "Sim", "Sim", "Sim"],
    ["Suporte prioritário", "—", "—", "Sim", "Sim", "Sim"],
    ["API / integrações", "—", "—", "—", "em breve", "em breve"],
    ["White-label", "—", "—", "—", "—", "Sim"],
]
t_planos = Table(planos, colWidths=[5.4*cm, 1.9*cm, 2.2*cm, 2.2*cm, 2.2*cm, 2.1*cm])
t_planos.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COR_PRIMARIA),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 10),
    ('BACKGROUND', (0, 1), (0, -1), COR_FUNDO_BOX),
    ('FONTNAME', (0, 1), (0, -1), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('TEXTCOLOR', (0, 1), (-1, -1), COR_TEXTO),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
    # destaque na coluna Pro (recomendado)
    ('BACKGROUND', (3, 1), (3, -1), HexColor("#eff6ff")),
]))
story.append(t_planos)

story.append(Spacer(1, 10))
story.append(Paragraph(
    "<b>Recomendado para engenheiro civil autônomo com volume médio:</b> plano Pro "
    "(R$ 449,90/mês). Projetos ilimitados, 100 documentos IA por mês (cobre cerca de 10 "
    "projetos completos com folga), portal do cliente, branding total e até 3 usuários "
    "(profissional + 2 estagiários ou parceiros). Cancelamento a qualquer momento.",
    style_quote
))
story.append(Paragraph(
    "<b>Plano Standard (R$ 199,90/mês):</b> indicado para o profissional autônomo que faz "
    "até 1 projeto/mês — já libera o portal do cliente, branding e multi-disciplina, sem "
    "marca d'água. <b>Pro Max (R$ 699,90/mês):</b> escritórios com equipe maior (até 10 "
    "usuários), 300 documentos IA/mês e API pública (em breve).",
    style_small
))

story.append(PageBreak())

# ----- 6. ESTIMATIVA DE RETORNO -----
story.append(Paragraph("6. Estimativa de retorno do investimento", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

story.append(Paragraph(
    "Considerando um engenheiro civil com volume médio de <b>1 projeto/mês</b> e valor-hora "
    "típico de <b>R$ 80/h</b> (autônomo Sul/Sudeste, especialização média):",
    style_body
))
story.append(Spacer(1, 6))

roi_table = [
    ["Tarefa", "Tempo manual", "Tempo c/ Memorial.ai", "Economia"],
    ["Levantamento e extração de planta", "3h", "10min", "2h50min"],
    ["Orçamento SINAPI", "8h", "30min", "7h30min"],
    ["Memorial descritivo arquitetônico", "6h", "20min", "5h40min"],
    ["Memoriais complementares (3 disc.)", "10h", "1h", "9h"],
    ["Proposta + contrato", "4h", "30min", "3h30min"],
    ["ART/RRT", "1h", "5min", "55min"],
    ["Acompanhamento de aprovação cliente", "2h (de retrabalho)", "0h", "2h"],
    ["TOTAL por projeto", "34h", "2h35min", "31h25min"],
]
t_roi = Table(roi_table, colWidths=[5.5*cm, 3*cm, 4*cm, 3.5*cm])
t_roi.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COR_PRIMARIA),
    ('TEXTCOLOR', (0, 0), (-1, 0), white),
    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
    ('FONTSIZE', (0, 0), (-1, 0), 9.5),
    ('FONTSIZE', (0, 1), (-1, -1), 9),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('ROWBACKGROUNDS', (0, 1), (-1, -2), [white, COR_FUNDO_BOX]),
    ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
    ('LEFTPADDING', (0, 0), (-1, -1), 6),
    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ('TOPPADDING', (0, 0), (-1, -1), 6),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
    # linha de total destacada
    ('BACKGROUND', (0, -1), (-1, -1), COR_PRIMARIA_CLARO),
    ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
]))
story.append(t_roi)

story.append(Spacer(1, 12))

roi_box = [
    [Paragraph("<b>Valor recuperado por projeto</b>", style_box_label),
     Paragraph("31h × R$ 80/h = <b>R$ 2.480</b>", style_box_value)],
    [Paragraph("<b>Custo do plano Standard/mês</b>", style_box_label),
     Paragraph("R$ 199,90", style_box_value)],
    [Paragraph("<b>ROI mensal (1 projeto)</b>", style_box_label),
     Paragraph("<b>1.140%</b> — recupera o custo do plano em ~2h30min de trabalho economizado", style_box_value)],
    [Paragraph("<b>Plano Pro (R$ 449,90) — 5 projetos/mês</b>", style_box_label),
     Paragraph("R$ 12.400 economizados vs R$ 449,90 = <b>ROI 2.656%</b>", style_box_value)],
    [Paragraph("<b>Tempo livre por mês</b>", style_box_label),
     Paragraph("~31 horas por projeto — equivalente a 4 dias úteis para captar novos clientes "
               "ou descansar", style_box_value)],
]
t_roi_box = Table(roi_box, colWidths=[5*cm, 11*cm])
t_roi_box.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (0, -1), COR_FUNDO_BOX),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('LEFTPADDING', (0, 0), (-1, -1), 10),
    ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ('TOPPADDING', (0, 0), (-1, -1), 8),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ('GRID', (0, 0), (-1, -1), 0.4, COR_BORDA),
]))
story.append(t_roi_box)

story.append(Spacer(1, 14))
story.append(Paragraph(
    "<b>Importante:</b> os números acima assumem que você usaria o tempo economizado para "
    "trabalho faturável. Mesmo em cenário pessimista — usar 50% do tempo livre para projetos "
    "novos — o ROI segue sendo > 500%/mês no plano Standard e > 1.300%/mês no plano Pro.",
    style_small
))

story.append(PageBreak())

# ----- 7. COMO TESTAR -----
story.append(Paragraph("7. Como avaliar a plataforma", style_h1))
story.append(HRFlowable(width="100%", thickness=2, color=COR_PRIMARIA, spaceBefore=2, spaceAfter=14))

story.append(Paragraph(
    "A plataforma está em produção e pode ser testada agora. Para uma avaliação completa:",
    style_body
))

passos = [
    "<b>1. Cadastre-se</b> em https://memorial-ai-mu.vercel.app com e-mail e senha. O plano "
    "Free permite criar 2 projetos para avaliação, com 3 documentos IA gratuitos para você "
    "experimentar a geração automática.",
    "<b>2. Use o botão \"Criar projeto demo\"</b> no dashboard para gerar um projeto fictício "
    "completo em 5 segundos. Tudo já vem populado: planta, extração, contrato. Permite "
    "explorar todas as telas sem cadastrar nada.",
    "<b>3. Suba uma planta sua</b> em PDF marcando \"Arquitetônico\" e veja a extração "
    "automática (~60 segundos). Confirme os dados e gere o orçamento SINAPI.",
    "<b>4. Teste a multi-disciplina:</b> suba projetos elétrico, hidráulico ou estrutural "
    "marcando a disciplina correta. Confirme as extrações e veja os itens adicionados ao "
    "orçamento agrupados por disciplina, com subtotais.",
    "<b>5. Gere os 10 documentos:</b> memorial arquitetônico, estrutural, hidrossanitário, "
    "elétrico, PPCI, impermeabilização, caderno técnico, proposta, contrato, cronograma. "
    "Cada um sai em PDF com a identidade do seu escritório.",
    "<b>6. Teste o portal do cliente:</b> envie um documento para si mesmo, abra o link "
    "do portal em outro navegador (ou modo anônimo), aprove com assinatura no canvas, e "
    "veja a confirmação chegar com IP/timestamp/hash registrados.",
    "<b>7. Solicite uma alteração de escopo</b> pelo portal e responda como profissional "
    "no escritório — vê o fluxo completo de aditivo formal.",
]
story.append(ListFlowable(
    [ListItem(Paragraph(p, style_body_left), leftIndent=10, value=i+1) for i, p in enumerate(passos)],
    bulletType='1',
    leftIndent=14,
    bulletColor=COR_PRIMARIA,
))

story.append(Spacer(1, 16))
story.append(HRFlowable(width="100%", thickness=0.5, color=COR_BORDA, spaceBefore=4, spaceAfter=16))

story.append(Paragraph("Contato e próximos passos", style_h2))

story.append(Paragraph(
    "Após a avaliação, o feedback de um engenheiro civil é crítico para refinar:",
    style_body
))

feedback_items = [
    "Precisão das extrações de projetos elétrico/hidráulico/estrutural — quais campos faltam, "
    "quais estão imprecisos.",
    "Cobertura das composições SINAPI — códigos faltantes que apareceriam no seu fluxo "
    "normal de trabalho.",
    "Conteúdo dos memoriais técnicos por disciplina — aderência ao que cliente/prefeitura "
    "esperam.",
    "Cláusulas do contrato — adequação ao seu modo de cobrar.",
    "Fluxo do portal do cliente — clareza para um cliente leigo.",
    "Funcionalidades que faltam para o seu fluxo específico (compatibilização visual, "
    "diário de obra, medições etc).",
]
story.append(ListFlowable(
    [ListItem(Paragraph(f, style_body), leftIndent=10) for f in feedback_items],
    bulletType='bullet',
    leftIndent=12,
    bulletColor=COR_PRIMARIA,
))

story.append(Spacer(1, 14))
story.append(Paragraph(
    "<b>Plataforma:</b> https://memorial-ai-mu.vercel.app<br/>"
    "<b>Sandbox (criar conta + projeto demo):</b> abre em 30 segundos<br/>"
    "<b>Plano para avaliação completa:</b> Free (gratuito, sem cartão)<br/>",
    style_body_left
))

story.append(Spacer(1, 8))
story.append(Paragraph(
    "Obrigado pela avaliação — qualquer dúvida técnica ou sugestão de melhoria é bem-vinda.",
    style_quote
))

# =============================================================================
# Build
# =============================================================================
import os
output_path = r"C:\Users\zanca\OneDrive\Desktop\Memorial-AI-Funcionalidades.pdf"
# se o arquivo está aberto/locked, salva como v2 para não bloquear
try:
    with open(output_path, "ab"):
        pass
except PermissionError:
    output_path = r"C:\Users\zanca\OneDrive\Desktop\Memorial-AI-Funcionalidades-v2.pdf"

doc = SimpleDocTemplate(
    output_path,
    pagesize=A4,
    leftMargin=2*cm,
    rightMargin=2*cm,
    topMargin=2*cm,
    bottomMargin=2.5*cm,
    title="Memorial.ai — Funcionalidades",
    author="Memorial.ai",
    subject="Apresentação técnica para engenheiro civil",
)


def first_page(canvas, doc):
    cover_page(canvas, doc)


def later_pages(canvas, doc):
    header_footer(canvas, doc)


doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
print(f"OK: {output_path}")
