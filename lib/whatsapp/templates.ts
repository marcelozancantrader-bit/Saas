/**
 * Templates de mensagem WhatsApp pra eventos do Memorial.ai.
 *
 * Mensagens são curtas e diretas (WhatsApp não é e-mail) — incluem link
 * pra abrir o portal/billing no próprio celular e identificam o
 * escritório no topo pra cliente saber quem está mandando.
 */

export type DocumentSentParams = {
  orgName: string;
  clientName: string;
  projectName: string;
  documentTitle: string;
  portalUrl: string;
};

export function renderDocumentSentWhatsapp(p: DocumentSentParams): string {
  const greeting = firstName(p.clientName) ? `Olá, ${firstName(p.clientName)}` : "Olá";
  return [
    `*${p.orgName}* enviou um documento pra sua aprovação 📄`,
    "",
    `${greeting}! O documento *${p.documentTitle}* do projeto *${p.projectName}* está pronto.`,
    "",
    `Abra pelo link abaixo, leia com calma e assine se estiver de acordo:`,
    p.portalUrl,
    "",
    "Funciona em qualquer celular. Sem cadastro. Qualquer dúvida, é só responder essa mensagem.",
  ].join("\n");
}

export type PaymentReminderParams = {
  orgName: string;
  clientName: string;
  valor: string; // ex: "R$ 1.299,90"
  vencimentoLabel: string; // ex: "15 de maio"
  invoiceUrl: string;
};

export function renderPaymentReminderWhatsapp(p: PaymentReminderParams): string {
  const greeting = firstName(p.clientName) ? `Olá, ${firstName(p.clientName)}` : "Olá";
  return [
    `*${p.orgName}* — lembrete de cobrança 💰`,
    "",
    `${greeting}, sua fatura de *${p.valor}* vence em *${p.vencimentoLabel}*.`,
    "",
    "Pague com PIX (copiar/colar ou QR Code) pelo link:",
    p.invoiceUrl,
    "",
    "Já pagou? Pode ignorar esta mensagem — a confirmação pode levar até 10 minutos pra chegar.",
  ].join("\n");
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
