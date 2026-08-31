// src/pages/public/about/functions.ts
// Conteúdo estático da landing "/sobre" — só dados, sem componente
// nenhum aqui (o ícone é referenciado por chave, mapeado pro componente
// do lucide-react dentro de index.tsx).

export type AboutIconKey = "sparkles" | "check" | "film" | "info";

export interface AboutFeature {
  icon: AboutIconKey;
  title: string;
  description: string;
}

export const FEATURES: AboutFeature[] = [
  {
    icon: "sparkles",
    title: "Timelines por descrição",
    description:
      "Escreva o que você quer assistir em texto livre — a gente entende o pedido e busca os títulos reais que combinam, sem formulário nenhum no meio do caminho.",
  },
  {
    icon: "check",
    title: "Acompanhe o que já viu",
    description:
      "Marque cada título como \"Já vi\" e acompanhe o progresso de cada timeline com uma barra visual — sempre saiba quanto falta.",
  },
  {
    icon: "film",
    title: "Em cartaz e bilheteria",
    description:
      "Veja o que está em cartaz no Brasil agora e os campeões de bilheteria do ano, com trailer oficial rodando direto na home.",
  },
  {
    icon: "info",
    title: "Detalhes completos",
    description:
      "Clique em qualquer pôster — da timeline, das fileiras ou da busca — pra ver sinopse, elenco, nota, gêneros e direção.",
  },
];

export interface AboutStep {
  number: string;
  title: string;
  description: string;
}

export const STEPS: AboutStep[] = [
  {
    number: "01",
    title: "Descreva o que você quer assistir",
    description:
      "Pode ser um ator, uma diretora, uma franquia inteira, um gênero, uma década, um país, um estúdio — ou uma mistura de tudo isso ao mesmo tempo.",
  },
  {
    number: "02",
    title: "Clique em \"criar timeline\"",
    description: "Só isso. Sem escolher categoria por categoria, sem telas intermediárias.",
  },
  {
    number: "03",
    title: "A busca acontece de verdade",
    description:
      "Seu pedido vira critérios reais de busca no catálogo — não uma lista inventada de memória. Se você não pedir uma quantidade específica, a timeline vem completa.",
  },
  {
    number: "04",
    title: "Assista e marque o progresso",
    description: "Marque \"Já vi\" em cada título conforme for assistindo e acompanhe o quanto já avançou.",
  },
];

// Exemplos reais de descrição — mostrados como chips na landing, cobrindo
// os eixos que a busca resolve de forma determinística (pessoa, franquia,
// gênero + época + idioma, estúdio, escopo "só os principais").
export const EXAMPLE_PROMPTS: string[] = [
  "filmes do Tom Cruise",
  "toda a saga Harry Potter",
  "terror coreano da última década",
  "filmes de animação da Pixar",
  "só os principais filmes do Nicolas Cage",
];
