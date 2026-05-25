/**
 * Script standalone — notifica clientes existentes do pricing v2.
 *
 * Roda 1× via `npx tsx scripts/notify-pricing-v2.ts`. Marca cada org com
 * `meta.pricing_v2_notified_at` pra idempotência (rerun safe).
 *
 * Escopo: todas as orgs com plano != 'free' e meta.pricing_v2_notified_at IS NULL.
 * Mensagem: explica novos planos (Solo/Pro/Studio) + grandfathering ativo.
 */

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const dbUrl = process.env.SUPABASE_DB_URL;
const resendKey = process.env.RESEND_API_KEY;
const resendFrom = process.env.RESEND_FROM_EMAIL;

if (!dbUrl) {
  console.error("SUPABASE_DB_URL não configurada em .env.local");
  process.exit(1);
}
if (!resendKey || !resendFrom) {
  console.error("RESEND_API_KEY ou RESEND_FROM_EMAIL não configurados — emails serão skipados");
}

const sql = postgres(dbUrl);

async function sendResendEmail(
  to: string[],
  subject: string,
  html: string,
  text: string,
): Promise<boolean> {
  if (!resendKey || !resendFrom) return false;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: resendFrom,
      to,
      subject,
      html,
      text,
      tags: [{ name: "type", value: "pricing.v2_notify" }],
    }),
  });
  if (!r.ok) {
    console.warn(`[notify-pricing-v2] resend failed ${r.status}: ${await r.text()}`);
    return false;
  }
  return true;
}

type OrgRow = {
  id: string;
  name: string;
  plano: string;
  meta: Record<string, unknown> | null;
};

async function main() {
  console.log("[notify-pricing-v2] buscando orgs elegíveis…");
  const orgs: OrgRow[] = await sql<OrgRow[]>`
    select id, name, plano, meta
    from public.organizations
    where plano != 'free'
      and (meta -> 'pricing_v2_notified_at') is null
    order by created_at asc
    limit 1000
  `;

  console.log(`[notify-pricing-v2] ${orgs.length} orgs a notificar`);

  let notified = 0;
  let skipped = 0;

  for (const org of orgs) {
    const emails = await getOwnerEmails(org.id);
    if (emails.length === 0) {
      skipped++;
      console.warn(`[notify-pricing-v2] org ${org.id} (${org.name}) sem owners — skip`);
      continue;
    }

    const sent = await sendResendEmail(
      emails,
      "Mudamos os planos do Memorial.ai — seu preço continua o mesmo",
      emailHtml(org.name),
      emailText(org.name),
    );
    if (!sent) {
      console.log(`[dry-run] org ${org.name} → ${emails.join(", ")}`);
    }

    await sql`
      update public.organizations
      set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('pricing_v2_notified_at', now()::text),
          updated_at = now()
      where id = ${org.id}
    `;

    notified++;
    if (notified % 10 === 0) console.log(`[notify-pricing-v2] ${notified}/${orgs.length}…`);
  }

  console.log(`[notify-pricing-v2] feito: notified=${notified} skipped=${skipped}`);
  await sql.end();
}

async function getOwnerEmails(orgId: string): Promise<string[]> {
  const rows = await sql<Array<{ email: string }>>`
    select u.email
    from public.organization_members m
    join auth.users u on u.id = m.user_id
    where m.org_id = ${orgId}
      and m.role in ('owner', 'admin')
      and u.email is not null
  `;
  return rows.map((r) => r.email);
}

function emailText(orgName: string): string {
  return `Olá,

Atualizamos os planos do Memorial.ai pra refletir o que você de fato usa
no dia-a-dia: Solo (R$ 89,90), Pro (R$ 219,90, recomendado) e Studio (R$ 499,90),
mais Agência sob consulta. Novos ciclos anuais (-20%) e PIX à vista (-25%).

Seu workspace "${orgName}" entra automaticamente no grandfathering — o valor
cobrado pelo Asaas continua exatamente o mesmo até maio/2027. Você não precisa
fazer nada.

Detalhes em https://memorial-ai-mu.vercel.app/billing

(Memorial.ai)`;
}

function emailHtml(orgName: string): string {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#18181b;">
      <h2 style="font-size:18px;margin:0 0 14px;">Atualizamos os planos — seu preço continua o mesmo</h2>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;">
        Novos planos: <strong>Solo R$ 89,90</strong>, <strong>Pro R$ 219,90</strong>
        (recomendado), <strong>Studio R$ 499,90</strong>, <strong>Agência</strong> sob consulta.
        Anual −20%, PIX à vista −25%.
      </p>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;">
        O workspace <strong>${orgName}</strong> entrou no grandfathering automaticamente
        — o valor cobrado continua igual até maio/2027. Você não precisa fazer nada.
      </p>
      <div style="margin:20px 0;">
        <a href="https://memorial-ai-mu.vercel.app/billing"
           style="display:inline-block;background:#1d4ed8;color:white;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
          Ver detalhes em /billing
        </a>
      </div>
      <p style="font-size:12px;color:#71717a;line-height:1.5;margin-top:24px;border-top:1px solid #e4e4e7;padding-top:12px;">
        Memorial.ai · copiloto documental para arquitetos e engenheiros
      </p>
    </div>
  `;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
