import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  category: "SINAPI" | "NBR" | "Contratos" | "Gestão";
  body: ReactNode;
};

const PostMemorialNbr: ReactNode = (
  <>
    <p>
      Memorial descritivo é o documento técnico que registra{" "}
      <strong>materiais, sistemas e acabamentos especificados em projeto</strong>. Sem ele,
      prefeituras devolvem o processo, construtoras compram errado e o cliente final fica com
      expectativa diferente do entregue.
    </p>
    <h2>O que a NBR 12.722 exige (e o que muita gente esquece)</h2>
    <p>
      A norma NBR 12.722/1992 da ABNT define o conteúdo mínimo do memorial descritivo pra
      edificações. Embora antiga, continua sendo a referência aceita pela maioria das prefeituras
      brasileiras. Os campos obrigatórios:
    </p>
    <ul>
      <li>
        <strong>Identificação da obra</strong>: endereço, área construída, número de pavimentos,
        finalidade (residencial/comercial)
      </li>
      <li>
        <strong>Sistema construtivo</strong>: tipo de fundação, estrutura, vedação, cobertura
      </li>
      <li>
        <strong>Acabamentos por ambiente</strong>: piso, parede, teto, esquadrias, louças/metais
      </li>
      <li>
        <strong>Instalações</strong>: hidrossanitárias, elétricas, gás, climatização (referência aos
        projetos complementares)
      </li>
      <li>
        <strong>Equipamentos especiais</strong>: caixa d&apos;água, reservatório inferior, bomba de
        recalque, gerador, elevador
      </li>
    </ul>
    <h2>O erro de copiar do projeto anterior</h2>
    <p>
      Quase todo arquiteto autônomo confessa: na correria do prazo, abre o memorial do projeto
      anterior e edita o nome do cliente. O problema é que{" "}
      <strong>memorial é prova jurídica do que foi contratado</strong>. Se você especifica
      &quot;piso porcelanato 60x60&quot; e o projeto anterior tinha &quot;piso cerâmico
      esmaltado&quot;, o cliente que pagou pelo porcelanato pode questionar.
    </p>
    <h2>NBR 15.575: o memorial encontra o desempenho</h2>
    <p>
      Desde 2013, a NBR 15.575 (Norma de Desempenho) responsabiliza o projetista por{" "}
      <strong>vida útil de projeto (VUP)</strong>: 50 anos pra estrutura, 13 pra vedação vertical, 8
      pra esquadrias externas. O memorial precisa indicar materiais compatíveis com essas exigências
      — caso contrário, vícios construtivos viram passivo do projetista.
    </p>
    <h2>Como o Memorial.ai resolve</h2>
    <p>
      Você sobe a planta em PDF; a IA extrai ambientes, áreas, padrão construtivo e elementos
      especiais; gera memorial citando NBR 12.722, 15.575 e 16.401 (climatização) conforme o caso.
      Você revisa em 5 minutos e exporta com a sua marca. O que levava 6–8 horas vira 15 min.
    </p>
  </>
);

const PostSinapiPasso: ReactNode = (
  <>
    <p>
      SINAPI (Sistema Nacional de Pesquisa de Custos e Índices da Construção Civil) é a tabela
      oficial usada por Caixa Econômica + IBGE pra precificar obras públicas. Nas privadas, é
      referência aceita por bancos (financiamentos), seguradoras e clientes informados.
    </p>
    <h2>Passo 1 — Escolher o mês e a UF de referência</h2>
    <p>
      Os preços SINAPI mudam todo mês e variam por UF. Use sempre o{" "}
      <strong>mês imediatamente anterior ao orçamento</strong> e a UF da obra. Pra obras no
      interior, alguns SINDUSCONs regionais publicam ajustes locais — vale conferir.
    </p>
    <h2>Passo 2 — Levantar quantitativos</h2>
    <p>
      Pra cada serviço (alvenaria, piso, esquadria, hidráulica, elétrica...), você precisa do
      <em> quantitativo</em>: m² de alvenaria, m³ de concreto, número de pontos elétricos. Saí
      direto da planta — mas levantamento manual em Excel toma 6–10 horas pra obra média.
    </p>
    <h2>Passo 3 — Buscar a composição certa</h2>
    <p>
      Cada serviço tem uma <strong>composição SINAPI</strong> que detalha o custo direto: material +
      mão de obra. Ex: composição 96523 = &quot;escavação manual de vala pra sapata corrida&quot;.
      Use o catálogo oficial pra achar o código — descrições parecidas têm preços muito diferentes.
    </p>
    <h2>Passo 4 — Aplicar BDI</h2>
    <p>
      BDI (Benefícios e Despesas Indiretas) cobre lucro, impostos, administração central e garantia.
      Pra obra particular: 25–32% típico. Pra obra pública: limite legal 27,86% (Acórdão TCU
      2622/2013) — mas o cálculo é mais complexo, com componentes específicos.
    </p>
    <h2>Passo 5 — Validar contra CUB regional</h2>
    <p>
      CUB (Custo Unitário Básico) é o R$/m² de referência publicado pelo SINDUSCON de cada UF. Se
      seu orçamento bate dentro da faixa CUB do padrão construtivo (popular/médio/alto/luxo), está
      coerente. Se está 30% acima ou 20% abaixo, algo está errado — pode ser quantitativo duplicado
      ou item esquecido.
    </p>
    <h2>O atalho com Memorial.ai</h2>
    <p>
      Sobe planta → IA extrai ambientes → gera 30+ itens SINAPI já com preço atual da sua UF, BDI
      configurável e validação CUB automática. Tempo: 1 minuto. Editar item-a-item: clica na linha e
      ajusta. Trocar SINAPI por composição própria: 1 clique.
    </p>
  </>
);

const PostContratoCau: ReactNode = (
  <>
    <p>
      Contrato escrito é obrigatório pra qualquer prestação de serviço de arquitetura ou engenharia
      no Brasil — Resolução CAU/BR 91/2014. Sem ele, o profissional fica exposto a calotes, mudanças
      de escopo não pagas e questionamentos sobre responsabilidade técnica.
    </p>
    <h2>O que não pode faltar (segundo o CAU)</h2>
    <ul>
      <li>
        <strong>Identificação completa</strong>: contratante e contratado, com endereço, CPF/CNPJ,
        registro no CAU/CREA
      </li>
      <li>
        <strong>Objeto detalhado</strong>: o que está sendo contratado (Projeto Legal? Completo?
        Acompanhamento RT?), em qual obra, com que área
      </li>
      <li>
        <strong>Escopo dos serviços</strong>: entregáveis específicos (plantas, cortes, fachadas,
        memorial, especificações). Itemizado.
      </li>
      <li>
        <strong>Prazo de execução</strong>: por etapa, em dias úteis, com marcos de aprovação
      </li>
      <li>
        <strong>Valor e forma de pagamento</strong>: parcelamento por etapa, reajuste por IPCA acima
        de 12 meses, multa por atraso
      </li>
      <li>
        <strong>Cláusula de alterações de escopo</strong> (CRÍTICA): qualquer mudança após aprovação
        de etapa = termo aditivo formal. Sem isso, o cliente pede &quot;só uma mudancinha&quot; toda
        semana e absorve o custo.
      </li>
      <li>
        <strong>Propriedade intelectual</strong>: direitos autorais permanecem do arquiteto (Lei
        9.610/98), cliente recebe licença pra aquela obra específica
      </li>
      <li>
        <strong>Responsabilidades</strong>: separar o que é do projetista (assinar ART/RRT) do que é
        do contratante (aprovação prefeitura, taxas)
      </li>
      <li>
        <strong>Rescisão</strong>: hipóteses + proporcionalidade do pago vs. executado
      </li>
      <li>
        <strong>Foro</strong>: comarca do contratado
      </li>
    </ul>
    <h2>Os 6 templates por tipo de obra</h2>
    <p>
      O mesmo contrato não serve pra todo escopo. Residencial unifamiliar PF é diferente de edifício
      multifamiliar PJ (que precisa cláusula de seguro RC). Reforma exige cláusula de vícios
      ocultos. Projeto Legal tem escopo limitado. Por isso o Memorial.ai oferece 6 templates
      pré-curados baseados nas resoluções CAU/BR 51, 67 e 91:
    </p>
    <ol>
      <li>Residencial unifamiliar (PF)</li>
      <li>Residencial multifamiliar (PJ — incorporadora)</li>
      <li>Comercial / Corporativo</li>
      <li>Reforma / Retrofit (com cláusula de contingência)</li>
      <li>Apenas Projeto Legal</li>
      <li>Projeto Completo + Acompanhamento RT</li>
    </ol>
    <p>
      Você escolhe o template, a IA personaliza com os dados do projeto e do cliente, e exporta em
      PDF. Cliente assina digitalmente no portal — IP, timestamp e hash registrados (MP 2.200-2).
    </p>
  </>
);

const PostAditivos: ReactNode = (
  <>
    <p>
      Pesquisa do Sebrae aponta que escritórios de arquitetura pequenos perdem em média{" "}
      <strong>5–15% do honorário</strong> em alterações de escopo não cobradas. É o famoso &quot;já
      que você vai mexer aí, só ajusta isso pra mim&quot;.
    </p>
    <h2>Por que isso acontece</h2>
    <ul>
      <li>Cliente acha que &quot;projeto não está pronto até estar como ele quer&quot;</li>
      <li>Profissional cede pra preservar o relacionamento e finalizar o pagamento</li>
      <li>Não existe processo formal pra precificar e documentar a alteração</li>
      <li>Comunicação por WhatsApp não vira registro contratual</li>
    </ul>
    <h2>A solução em 4 passos</h2>
    <ol>
      <li>
        <strong>Cláusula no contrato</strong>: definir que toda alteração após aprovação de etapa é
        aditivo formal, com valor mínimo (10–15% do honorário da etapa). Limitar revisões inclusas
        (3 típico).
      </li>
      <li>
        <strong>Registro digital</strong>: cliente solicita via portal, fica gravado com data e
        hora. Sem WhatsApp.
      </li>
      <li>
        <strong>Resposta formal</strong>: profissional analisa, define valor adicional e prazo,
        manda de volta pro cliente
      </li>
      <li>
        <strong>Assinatura digital</strong>: cliente aprova ou rejeita. Aprovado vira aditivo
        contratual com IP + timestamp + hash. Soma ao contrato.
      </li>
    </ol>
    <h2>Como o Memorial.ai automatiza</h2>
    <p>
      No portal do cliente, qualquer cliente pode solicitar alteração via formulário. Você recebe
      notificação, abre, define valor e prazo. Cliente vê a proposta de aditivo e assina (ou recusa)
      digitalmente. Tudo fica no audit log pra prova legal. Resultado: aditivo virou receita em vez
      de prejuízo.
    </p>
  </>
);

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "memorial-descritivo-nbr-15575",
    title: "Memorial descritivo: o que a NBR 12.722 e 15.575 exigem",
    description:
      "Guia prático sobre o conteúdo mínimo de memorial descritivo no Brasil, responsabilidade pela vida útil de projeto e o erro de copiar do projeto anterior.",
    publishedAt: "2026-05-20",
    readingMinutes: 6,
    category: "NBR",
    body: PostMemorialNbr,
  },
  {
    slug: "orcamento-sinapi-passo-a-passo",
    title: "Orçamento SINAPI passo a passo (com BDI e validação CUB)",
    description:
      "Como montar orçamento de obra usando SINAPI corretamente: escolher mês, quantitativos, composições, BDI e validar contra CUB regional.",
    publishedAt: "2026-05-18",
    readingMinutes: 7,
    category: "SINAPI",
    body: PostSinapiPasso,
  },
  {
    slug: "contrato-arquitetura-cau",
    title: "Contrato de arquitetura: o que o CAU/BR exige",
    description:
      "Cláusulas obrigatórias num contrato de prestação de serviço de arquitetura segundo a Resolução CAU/BR 91/2014 + os 6 templates por tipo de obra.",
    publishedAt: "2026-05-15",
    readingMinutes: 8,
    category: "Contratos",
    body: PostContratoCau,
  },
  {
    slug: "aditivo-de-obra-como-cobrar",
    title: "Aditivo de obra: como parar de perder 10% do contrato",
    description:
      "Por que escritórios pequenos perdem 5-15% do honorário em alterações de escopo não cobradas e como formalizar aditivos em 4 passos.",
    publishedAt: "2026-05-12",
    readingMinutes: 5,
    category: "Gestão",
    body: PostAditivos,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
