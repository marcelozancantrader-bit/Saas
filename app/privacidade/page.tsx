import Link from "next/link";

export const metadata = {
  title: "Política de Privacidade — Memorial.ai",
  description: "Como tratamos seus dados em conformidade com a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Política de Privacidade</h1>
      <p className="mt-2 text-sm text-zinc-500">Última atualização: 18 de maio de 2026.</p>

      <div className="prose prose-zinc dark:prose-invert mt-8 max-w-none text-sm">
        <h2 className="mt-8 text-lg font-semibold">1. Quem somos</h2>
        <p>
          Memorial.ai é um SaaS B2B para arquitetos e engenheiros civis brasileiros. Operamos como
          controlador de dados nos termos da Lei 13.709/2018 (LGPD) e do Marco Civil da Internet.
        </p>

        <h2 className="mt-6 text-lg font-semibold">2. Dados que coletamos</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Conta do profissional:</strong> e-mail, senha (armazenada com hash), nome do
            escritório, papel, registro CAU/CREA, CNPJ (opcional), preferências de BDI e PIX.
          </li>
          <li>
            <strong>Dados dos clientes:</strong> nome, CPF/CNPJ, e-mail, telefone, endereço. Estes
            dados pertencem ao seu cliente — você os trata como operador delegado e tem obrigação de
            informá-lo.
          </li>
          <li>
            <strong>Projetos:</strong> arquivos enviados (plantas, fotos), metadados do imóvel,
            ambientes extraídos da planta, documentos gerados.
          </li>
          <li>
            <strong>Atividade:</strong> audit log com IP, user-agent, timestamps das ações críticas
            (aprovações, alterações de escopo).
          </li>
          <li>
            <strong>Cobrança:</strong> dados de assinatura repassados ao Asaas (CNPJ/CPF, dados de
            pagamento). Não armazenamos cartão.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">3. Por que coletamos (bases legais)</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Execução de contrato</strong> (art. 7º, V) — dados necessários para entregar o
            serviço contratado.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal</strong> (art. 7º, II) — emissão fiscal e
            registros de auditoria.
          </li>
          <li>
            <strong>Legítimo interesse</strong> (art. 7º, IX) — métricas agregadas de uso para
            melhorar o produto.
          </li>
          <li>
            <strong>Consentimento</strong> (art. 7º, I) — comunicações de marketing (opt-in
            explícito, revogável a qualquer momento).
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">4. Compartilhamento com terceiros</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Anthropic</strong> (EUA) — geração de documentos por IA. Enviamos contexto do
            projeto, recebemos o documento. Não treinamos modelos com seus dados.
          </li>
          <li>
            <strong>Supabase</strong> (EUA / sa-east-1 BR) — hospedagem do banco de dados e
            arquivos. Servidor primário no Brasil.
          </li>
          <li>
            <strong>Vercel</strong> (EUA) — hospedagem da aplicação.
          </li>
          <li>
            <strong>Asaas</strong> (Brasil) — processamento de pagamentos.
          </li>
          <li>
            <strong>Resend</strong> (EUA) — envio de e-mails transacionais.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">5. Seus direitos (art. 18 LGPD)</h2>
        <p>Você pode, a qualquer momento, em Configurações &gt; Privacidade:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Confirmar e acessar</strong> seus dados (download em JSON via{" "}
            <code>/api/lgpd/export</code>).
          </li>
          <li>
            <strong>Corrigir</strong> dados incompletos ou inexatos (edição direta no app).
          </li>
          <li>
            <strong>Eliminar</strong> sua conta e todos os dados das organizações onde você é owner.
          </li>
          <li>
            <strong>Portar</strong> dados a outro fornecedor (use o JSON do export).
          </li>
          <li>
            <strong>Revogar consentimento</strong> em comunicações de marketing.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">6. Retenção</h2>
        <p>
          Dados ativos: enquanto a conta estiver ativa. Dados de audit log: 5 anos após a exclusão
          da conta, para cumprimento de obrigações legais e probatórias. Backups: 30 dias.
        </p>

        <h2 className="mt-6 text-lg font-semibold">7. Segurança</h2>
        <p>
          Comunicação em HTTPS, criptografia em repouso (AES-256 via Supabase), isolamento por
          organização via Row-Level Security do PostgreSQL, audit log imutável de ações críticas. Em
          caso de incidente, comunicamos a ANPD e os titulares em até 72 horas.
        </p>

        <h2 className="mt-6 text-lg font-semibold">8. Encarregado (DPO)</h2>
        <p>
          Para exercer direitos ou esclarecer dúvidas: <strong>dpo@memorial.ai</strong>.
        </p>

        <h2 className="mt-6 text-lg font-semibold">9. Alterações</h2>
        <p>
          Mudanças relevantes são comunicadas por e-mail e in-app com pelo menos 30 dias de
          antecedência. Esta versão substitui qualquer anterior.
        </p>
      </div>
    </main>
  );
}
