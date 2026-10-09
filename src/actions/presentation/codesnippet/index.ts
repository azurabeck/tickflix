// De onde tirar um trecho de código real do projeto: o arquivo, a função (ou interface) e, se quiser só uma parte dela, onde começa e termina.
// usado em: presentation/cycles e nos ciclos da Apresentação
export interface SnippetRef {
  file: string; // caminho a partir da raiz do projeto, ex.: "src/actions/movies/dashboard/index.ts"
  name: string; // nome da função, const, interface ou type
  from?: string; // primeira linha do trecho (a primeira que contém este texto, dentro da função)
  to?: string; // última linha do trecho (inclusive)
  until?: string; // o trecho para ANTES da primeira linha que contém este texto
  before?: number; // linhas extras antes de `from`
  after?: number; // linhas extras depois de `to`
  lines?: number; // quantas linhas mostrar a partir de `from` (no lugar de `to`)
}

// Um trecho pronto para mostrar: o código sem a margem e em que linhas do arquivo ele está.
// usado em: PresentationCycle
export interface Snippet {
  code: string;
  firstLine: number;
  lastLine: number;
}

const declarationPattern = (name: string): RegExp => new RegExp(`^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:const|function|interface|type)\\s+${name}\\b`);

// Quanto a linha abre ou fecha de {, ( e [ (ignora texto entre aspas e comentários de uma linha).
// `state.quote` lembra se uma linha terminou dentro de um texto de crase (que pode ter várias linhas).
const depthChange = (line: string, state: { quote: string | null }): number => {
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (state.quote) {
      if (char === "\\") i++;
      else if (char === state.quote) state.quote = null;
      continue;
    }
    if (char === "/" && line[i + 1] === "/") break;
    if (char === '"' || char === "'" || char === "`") state.quote = char;
    else if (char === "{" || char === "(" || char === "[") depth++;
    else if (char === "}" || char === ")" || char === "]") depth--;
  }
  if (state.quote && state.quote !== "`") state.quote = null; // aspas simples e duplas não passam para a linha seguinte
  return depth;
};

// Acha onde a declaração começa e termina: termina na primeira linha em que tudo foi fechado e que acaba em `;` ou `}`.
const findBlock = (lines: string[], name: string): [number, number] | null => {
  const pattern = declarationPattern(name);
  const start = lines.findIndex((line) => pattern.test(line));
  if (start === -1) return null;

  let depth = 0;
  const state = { quote: null as string | null };
  for (let i = start; i < lines.length; i++) {
    depth += depthChange(lines[i], state);
    const ending = lines[i].trimEnd();
    if (depth <= 0 && !state.quote && (ending.endsWith(";") || ending.endsWith("}"))) return [start, i];
  }
  return null;
};

const dedent = (lines: string[]): string[] => {
  const indents = lines.filter((line) => line.trim()).map((line) => line.length - line.trimStart().length);
  const margin = indents.length > 0 ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(margin));
};

// Tira do código-fonte o trecho pedido. Devolve null se não achar (o código mudou): quem mostra avisa, em vez de inventar.
// usado em: presentation/cycles
export const extractSnippet = (source: string, ref: SnippetRef): Snippet | null => {
  const lines = source.split(/\r?\n/);
  const block = findBlock(lines, ref.name);
  if (!block) return null;
  let [first, last] = block;

  if (ref.from) {
    const fromIndex = lines.findIndex((line, i) => i >= first && i <= last && line.includes(ref.from!));
    if (fromIndex === -1) return null;
    first = fromIndex - (ref.before ?? 0);

    if (ref.lines !== undefined) {
      last = Math.min(fromIndex + ref.lines - 1, block[1]);
    } else if (ref.to) {
      const toIndex = lines.findIndex((line, i) => i >= fromIndex && i <= block[1] && line.includes(ref.to!));
      if (toIndex === -1) return null;
      last = Math.min(toIndex + (ref.after ?? 0), block[1]);
    } else if (ref.until) {
      const untilIndex = lines.findIndex((line, i) => i > fromIndex && i <= block[1] && line.includes(ref.until!));
      if (untilIndex === -1) return null;
      last = untilIndex - 1;
    }
  }

  while (last > first && !lines[last].trim()) last--; // sem linhas vazias no fim
  return { code: dedent(lines.slice(first, last + 1)).join("\n"), firstLine: first + 1, lastLine: last + 1 };
};

// Pedaço de uma linha de código, com o tipo (para colorir).
// usado em: CodeBlock
interface CodeToken {
  text: string;
  kind: "comment" | "string" | "keyword" | "plain";
}

const KEYWORDS = new Set([
  "const", "let", "return", "if", "else", "await", "async", "function", "export", "import", "from", "try", "catch", "finally", "throw", "new",
  "true", "false", "null", "undefined", "type", "interface", "extends", "typeof", "of", "in",
]);

// Divide uma linha de código em pedaços coloridos: comentário, texto entre aspas, palavra-chave e o resto. Simples de propósito (não é um parser).
// usado em: CodeBlock
export const tokenizeLine = (line: string): CodeToken[] => {
  const commentAt = line.search(/(^|\s)\/\//);
  const code = commentAt === -1 ? line : line.slice(0, commentAt);
  const comment = commentAt === -1 ? "" : line.slice(commentAt);

  const tokens: CodeToken[] = [];
  for (const part of code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/)) {
    if (!part) continue;
    if (/^["'`]/.test(part)) {
      tokens.push({ text: part, kind: "string" });
      continue;
    }
    for (const word of part.split(/(\b[A-Za-z_]+\b)/)) {
      if (word) tokens.push({ text: word, kind: KEYWORDS.has(word) ? "keyword" : "plain" });
    }
  }
  if (comment) tokens.push({ text: comment, kind: "comment" });
  return tokens;
};
