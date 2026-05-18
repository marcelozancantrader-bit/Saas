import Link from "next/link";

export const metadata = {
  title: "Termos de Uso — Memorial.ai",
  description: "Regras do serviço.",
};

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <Link href="/" className="text-sm text-zinc-500 hover:underline">
        ← Voltar
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Termos de Uso</h1>
      <p className="mt-2 text-sm text-zinc-500">Última atualização: 18 de maio de 2026.</p>

      <div className="prose prose-zinc dark:prose-invert mt-8 max-w-none text-sm">
        <h2 className="mt-8 text-lg font-semibold">1. Aceite</h2>
        <p>
          Ao criar uma conta no Memorial.ai, você confirma que leu e concorda com estes Termos e com
          a <Link href="/privacidade">Política de Privacidade</Link>. Se você está contratando em
          nome de uma pessoa jurídica, declara ter poderes para representá-la.
        </p>

        <h2 className="mt-6 text-lg font-semibold">2. O serviço</h2>
        <p>
          Memorial.ai é uma ferramenta de produtividade para arquitetos e engenheiros civis que
          assiste na geração de documentos técnicos por IA (memorial descritivo, caderno de
          especificações, proposta comercial, contrato), cálculo de orçamentos baseados em tabela
          SINAPI e gestão de aprovações com clientes via portal.
        </p>

        <h2 className="mt-6 text-lg font-semibold">3. Responsabilidade técnica</h2>
        <p>
          Os documentos gerados por IA são <strong>rascunhos técnicos</strong>. A responsabilidade
          pelo conteúdo, conformidade normativa e adequação ao projeto é{" "}
          <strong>integral e exclusiva do profissional emissor</strong>, que deve revisar e assinar
          cada documento antes do uso. Memorial.ai não substitui o juízo profissional.
        </p>

        <h2 className="mt-6 text-lg font-semibold">4. Orçamento e SINAPI</h2>
        <p>
          O cálculo do orçamento usa preços da tabela SINAPI (CAIXA) na versão indicada. Os valores
          são referenciais e podem divergir do custo real em função de regionalização fina, BDI
          praticado, encargos sociais aplicados e variação de mercado. Cabe ao profissional validar
          com fornecedores reais antes de comprometer-se com cliente.
        </p>

        <h2 className="mt-6 text-lg font-semibold">5. Portal do cliente e assinatura digital</h2>
        <p>
          Aprovações coletadas via portal são registradas com data, hora, IP, user-agent, assinatura
          por desenho e hash do documento. Têm validade jurídica equivalente à assinatura física
          conforme MP 2.200-2/2001 — mas não substituem certificado ICP-Brasil em situações que
          exigem fé pública (registros de imóveis, atos notariais).
        </p>

        <h2 className="mt-6 text-lg font-semibold">6. Planos e cobrança</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Planos pagos são <strong>mensais, com renovação automática</strong>, cobrados via
            PIX/boleto/cartão pela Asaas.
          </li>
          <li>
            Cancelamento pode ser feito a qualquer momento pela área de Billing. Você mantém acesso
            até o fim do período já pago.
          </li>
          <li>
            Limites técnicos (projetos ativos, documentos IA por mês, usuários) são enforcement por
            software conforme o plano contratado.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">7. Uso aceitável</h2>
        <p>Você concorda em NÃO:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Usar o serviço para fim ilícito ou que viole direitos de terceiros.</li>
          <li>
            Tentar engenharia reversa, scraping em massa ou contornar limites técnicos do plano.
          </li>
          <li>Compartilhar credenciais ou ceder acesso fora dos termos do plano.</li>
          <li>Subir conteúdo malicioso (malware, dados sensíveis sem base legal).</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold">8. Propriedade intelectual</h2>
        <p>
          Você mantém propriedade total dos dados que insere e dos documentos finais que produz. Nós
          retemos propriedade do software, dos prompts proprietários, da curadoria SINAPI e da marca
          Memorial.ai.
        </p>

        <h2 className="mt-6 text-lg font-semibold">9. Limitação de responsabilidade</h2>
        <p>
          O serviço é fornecido &quot;no estado em que se encontra&quot;. Limitamos nossa
          responsabilidade ao valor pago pelo plano nos últimos 12 meses. Não respondemos por lucros
          cessantes, indireto, ou por decisões técnicas tomadas com base em outputs do sistema sem
          revisão profissional.
        </p>

        <h2 className="mt-6 text-lg font-semibold">10. Disponibilidade</h2>
        <p>
          Nosso compromisso é uptime de 99.5% mensal, excluindo manutenção programada anunciada.
          Indisponibilidade superior gera crédito proporcional no plano (não reembolso).
        </p>

        <h2 className="mt-6 text-lg font-semibold">11. Foro</h2>
        <p>
          Estes Termos são regidos pela lei brasileira. Foro de Curitiba/PR para qualquer
          controvérsia, com renúncia a qualquer outro.
        </p>

        <h2 className="mt-6 text-lg font-semibold">12. Contato</h2>
        <p>
          Dúvidas: <strong>suporte@memorial.ai</strong>.
        </p>
      </div>
    </main>
  );
}
