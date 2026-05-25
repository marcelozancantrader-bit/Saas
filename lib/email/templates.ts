import "server-only";

/**
 * Templates HTML para emails Resend, com header brand consistente.
 *
 * Mantemos HTML inline (sem JSX no Resend SDK) porque o cliente Resend é
 * HTTP-direto (lib/email/resend.ts) — bundle leve. Email clients são notório-
 * mente arcaicos, então usamos table layout + inline styles em vez de
 * Tailwind / classes externas.
 *
 * Cores brand (hex):
 *   Primary deep blue:   #1E3A8A
 *   Accent light blue:   #60A5FA
 *   Slate dark text:     #0F172A
 *   Slate mid:           #475569
 *   Slate light bg:      #F1F5F9
 */

const BRAND_PRIMARY = "#1E3A8A";
const BRAND_ACCENT = "#60A5FA";
const TEXT_DARK = "#0F172A";
const TEXT_MID = "#475569";
const BG_LIGHT = "#F8FAFC";
const BORDER = "#E2E8F0";

/** Logo SVG inline (M arquitetônico + ponto azul claro). */
function logoSvg(size = 36): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
    <rect width="32" height="32" rx="7" fill="${BRAND_PRIMARY}"/>
    <path d="M7 24 L7 9 L12 17 L16 11 L20 17 L25 9 L25 24" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="25" cy="24" r="1.6" fill="${BRAND_ACCENT}"/>
  </svg>`;
}

type EmailLayoutInput = {
  preheader?: string;
  orgName: string;
  greeting: string;
  body: string; // HTML safe — caller já escapa
  cta?: { label: string; href: string };
  footer?: string;
};

export function renderEmailLayout(input: EmailLayoutInput): string {
  const cta = input.cta
    ? `<table cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
        <tr><td>
          <a href="${input.cta.href}"
             style="display:inline-block;background:${BRAND_PRIMARY};color:#FFFFFF;
                    padding:14px 28px;border-radius:8px;text-decoration:none;
                    font-weight:600;font-size:15px;font-family:system-ui,-apple-system,sans-serif;">
            ${input.cta.label}
          </a>
        </td></tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${input.orgName}</title>
</head>
<body style="margin:0;padding:0;background:${BG_LIGHT};font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${TEXT_DARK};">
${input.preheader ? `<div style="display:none;font-size:1px;color:${BG_LIGHT};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${input.preheader}</div>` : ""}

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BG_LIGHT};padding:32px 16px;">
  <tr><td align="center">

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background:#FFFFFF;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;">

      <!-- Header com logo + nome da org -->
      <tr><td style="padding:24px 32px;background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,#2E5BAA 100%);">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="vertical-align:middle;">
              ${logoSvg(36)}
            </td>
            <td style="vertical-align:middle;padding-left:12px;color:#FFFFFF;font-size:14px;font-weight:500;text-align:left;">
              ${input.orgName}<br>
              <span style="font-size:11px;color:#BFDBFE;font-weight:400;">via Memorial.ai</span>
            </td>
          </tr>
        </table>
      </td></tr>

      <!-- Conteúdo -->
      <tr><td style="padding:32px;color:${TEXT_DARK};font-size:15px;line-height:1.55;">
        <p style="margin:0 0 16px;color:${TEXT_DARK};">${input.greeting}</p>
        ${input.body}
        ${cta}
      </td></tr>

      <!-- Rodapé -->
      <tr><td style="padding:18px 32px;background:${BG_LIGHT};border-top:1px solid ${BORDER};font-size:12px;color:${TEXT_MID};text-align:center;">
        ${input.footer ?? `${input.orgName} usa Memorial.ai como copiloto documental.`}
      </td></tr>

    </table>

    <p style="margin:20px 0 0;color:${TEXT_MID};font-size:11px;text-align:center;max-width:600px;">
      Você recebeu este e-mail porque é cliente de ${input.orgName}.
      Para parar de receber, fale com o profissional responsável.
    </p>

  </td></tr>
</table>
</body>
</html>`;
}

/**
 * Template específico: "Novo documento aguardando sua aprovação".
 * Usado por send-to-portal.action.ts.
 */
export function renderDocumentSentEmail(input: {
  orgName: string;
  clientName: string;
  projectName: string;
  documentTitle: string;
  portalUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `${input.orgName}: novo documento para sua aprovação — ${input.documentTitle}`;

  const html = renderEmailLayout({
    preheader: `Você tem um novo documento para revisar no projeto ${input.projectName}`,
    orgName: input.orgName,
    greeting: `Olá <strong>${input.clientName}</strong>,`,
    body: `
      <p style="margin:0 0 14px;">
        Você recebeu um novo documento para revisar e aprovar no projeto
        <strong>${input.projectName}</strong>:
      </p>
      <p style="margin:0 0 14px;padding:14px 18px;background:${BG_LIGHT};border-left:3px solid ${BRAND_PRIMARY};border-radius:6px;font-size:16px;font-weight:500;">
        ${input.documentTitle}
      </p>
      <p style="margin:0 0 6px;color:${TEXT_MID};font-size:14px;">
        Pelo portal você pode ler o conteúdo completo e aprovar com assinatura
        digital. Sua aprovação fica registrada com data, hora e identificador
        único para validade legal.
      </p>
    `,
    cta: { label: "Abrir portal do projeto →", href: input.portalUrl },
    footer: `Link único e pessoal — não compartilhe.<br><a href="${input.portalUrl}" style="color:${TEXT_MID};word-break:break-all;">${input.portalUrl}</a>`,
  });

  const text = `Olá ${input.clientName},

Você recebeu um novo documento para sua aprovação no projeto ${input.projectName}:

  ${input.documentTitle}

Abra o portal: ${input.portalUrl}

(${input.orgName} via Memorial.ai)`;

  return { html, text, subject };
}

/**
 * Template específico: trial acabando em ~24h.
 * Disparado pelo cron trial-reminder-cron pros owners/admins da org.
 */
export function renderTrialReminderEmail(input: {
  orgName: string;
  planLabel: string;
  endsAt: Date;
  billingUrl: string;
}): { html: string; text: string; subject: string } {
  const dateStr = input.endsAt.toLocaleDateString("pt-BR");
  const subject = `Seu trial ${input.planLabel} acaba amanhã (${dateStr})`;

  const html = renderEmailLayout({
    preheader: `Seu trial ${input.planLabel} acaba em menos de 24 horas — assine pra manter o acesso.`,
    orgName: input.orgName,
    greeting: `Olá,`,
    body: `
      <p style="margin:0 0 14px;">
        Seu trial do plano <strong>${input.planLabel}</strong> acaba <strong>amanhã (${dateStr})</strong>.
      </p>
      <p style="margin:0 0 14px;color:${TEXT_MID};font-size:14px;">
        Depois disso, o workspace <strong>${input.orgName}</strong> volta pro plano Free automaticamente.
        Seus projetos e documentos continuam intactos, mas você perde projetos ilimitados,
        100 docs IA/mês, portal do cliente e branding completo.
      </p>
      <p style="margin:0 0 6px;">
        Para manter tudo desbloqueado, assine agora pelo /billing — pagamento via PIX.
      </p>
    `,
    cta: { label: "Assinar agora →", href: input.billingUrl },
    footer: `Memorial.ai · copiloto documental para arquitetos e engenheiros`,
  });

  const text = `Seu trial ${input.planLabel} acaba amanhã (${dateStr}).

Sem assinatura, o workspace ${input.orgName} volta pro Free. Seus dados ficam intactos, mas
você perde projetos ilimitados, 100 docs IA/mês, portal do cliente e branding.

Assine agora: ${input.billingUrl}

(Memorial.ai)`;

  return { html, text, subject };
}

/**
 * Template específico: trial em D-3 (3 dias antes do fim).
 * Tom menos urgente que o D-1 — convite a explorar antes do prazo apertar.
 */
export function renderTrialReminderD3Email(input: {
  orgName: string;
  planLabel: string;
  endsAt: Date;
  billingUrl: string;
}): { html: string; text: string; subject: string } {
  const dateStr = input.endsAt.toLocaleDateString("pt-BR");
  const subject = `3 dias restantes do seu trial ${input.planLabel}`;

  const html = renderEmailLayout({
    preheader: `Seu trial ${input.planLabel} acaba em 3 dias (${dateStr}) — última chance de explorar antes.`,
    orgName: input.orgName,
    greeting: `Olá,`,
    body: `
      <p style="margin:0 0 14px;">
        Faltam <strong>3 dias</strong> pro fim do seu trial do plano
        <strong>${input.planLabel}</strong> (encerra em ${dateStr}).
      </p>
      <p style="margin:0 0 14px;color:${TEXT_MID};font-size:14px;">
        Se ainda não testou tudo, esse é o momento — quantitativo IA da planta,
        diário de obra com fotos, WhatsApp ao cliente, biblioteca de templates
        do escritório. Coisas que viram horas de retrabalho.
      </p>
      <p style="margin:0 0 6px;">
        Se já decidiu, assine agora (PIX à vista anual tem 25% OFF):
      </p>
    `,
    cta: { label: "Ver planos →", href: input.billingUrl },
    footer: `Memorial.ai · copiloto documental para arquitetos e engenheiros`,
  });

  const text = `3 dias restantes do seu trial ${input.planLabel} (acaba em ${dateStr}).

Última chance de testar quantitativo IA, diário de obra, WhatsApp e biblioteca de templates
antes de virar Free.

PIX à vista anual: 25% OFF. Ver planos: ${input.billingUrl}

(Memorial.ai)`;

  return { html, text, subject };
}

/**
 * Template específico: trial encerrado (downgrade pra free).
 * Disparado pelo cron expired-trials-cron pros owners/admins da org.
 */
export function renderTrialExpiredEmail(input: {
  orgName: string;
  planLabel: string;
  billingUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Seu trial ${input.planLabel} acabou — assine pra continuar`;

  const html = renderEmailLayout({
    preheader: `O trial de ${input.planLabel} encerrou. Workspace ${input.orgName} voltou pro Free.`,
    orgName: input.orgName,
    greeting: `Olá,`,
    body: `
      <p style="margin:0 0 14px;">
        Seu período de teste do plano <strong>${input.planLabel}</strong> terminou. O workspace
        <strong>${input.orgName}</strong> voltou automaticamente para o plano Free.
      </p>
      <p style="margin:0 0 14px;color:${TEXT_MID};font-size:14px;">
        Os limites do Free voltaram a valer (2 projetos ativos, 3 documentos IA/mês, sem portal
        do cliente). Seus projetos e documentos continuam intactos.
      </p>
      <p style="margin:0 0 6px;">
        Para destravar tudo de novo, basta assinar pelo /billing — pagamento via PIX.
      </p>
    `,
    cta: { label: "Assinar agora →", href: input.billingUrl },
    footer: `Memorial.ai · copiloto documental para arquitetos e engenheiros`,
  });

  const text = `Seu trial ${input.planLabel} acabou.

O workspace ${input.orgName} voltou pro Free. Seus projetos e documentos continuam intactos,
mas os limites do Free voltaram a valer.

Assine novamente: ${input.billingUrl}

(Memorial.ai)`;

  return { html, text, subject };
}
