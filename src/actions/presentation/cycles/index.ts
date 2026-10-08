import { useEffect, useMemo, useState } from "react";
import { extractSnippet, type Snippet, type SnippetRef } from "@/actions/presentation/codesnippet";
import { NOTES_CYCLE } from "@/actions/presentation/cyclenotes";
import { PROGRESS_CYCLE } from "@/actions/presentation/cycleprogress";
import { RENDER_CYCLE } from "@/actions/presentation/cyclerender";
import { CACHE_PROBLEM } from "@/actions/presentation/problemcache";
import { CONTEXT_PROBLEM } from "@/actions/presentation/problemcontext";
import { GEMINIKEY_PROBLEM } from "@/actions/presentation/problemgeminikey";
import { FILTERS_CYCLE } from "@/actions/presentation/cyclefilters";
import { FOLLOWING_CYCLE } from "@/actions/presentation/cyclefollowing";
import { SUGGESTIONS_CYCLE } from "@/actions/presentation/cyclesuggestions";
import { TIMELINEAI_CYCLE } from "@/actions/presentation/cycletimelineai";
import { WATCHED_CYCLE } from "@/actions/presentation/cyclewatched";

// Por onde o caminho passa: o que fala com o backend, o que fala com o Firebase, ou o que só acontece em séries e animes.
// usado em: PresentationCycle
export type StepLane = "backend" | "firebase" | "series";

// Uma etapa de um ciclo: o que acontece (em frase curta) e o trecho de código responsável.
// Se a etapa tem `children`, é porque ela faz várias coisas: as de dentro só aparecem na trilha quando a etapa é escolhida.
// usado em: presentation/cyclerender
export interface CycleStep {
  id: string;
  title: string;
  text: string;
  code: SnippetRef;
  lane?: StepLane;
  note?: string; // aviso quando algo não está claro no código
  children?: CycleStep[];
}

// Um ciclo completo (ou, em Problemas & Soluções, o ciclo de vida da solução): do que dispara até o que aparece na tela, em etapas.
// usado em: presentation/cyclerender
export interface Cycle {
  id: string;
  title: string;
  intro: string;
  problem?: { why: string; what: string }; // só nas páginas de Problemas & Soluções: por que era um problema e o que foi feito
  steps: CycleStep[];
}

// Os ciclos do menu "Ciclo de Funções", na ordem em que aparecem. Quem ainda não tem conteúdo fica fora de CYCLES.
// usado em: presentation/tabs
export const CYCLE_IDS = ["render", "watched", "following", "filters", "timelineai", "suggestions", "progress", "notes"] as const;

// Os itens do menu "Problemas & Soluções", na ordem em que aparecem.
// usado em: presentation/tabs
export const PROBLEM_IDS = ["cache", "geminikey", "context"] as const;

const CYCLES: Record<string, Cycle> = Object.fromEntries([RENDER_CYCLE, WATCHED_CYCLE, FOLLOWING_CYCLE, FILTERS_CYCLE, TIMELINEAI_CYCLE, SUGGESTIONS_CYCLE, PROGRESS_CYCLE, NOTES_CYCLE, CACHE_PROBLEM, GEMINIKEY_PROBLEM, CONTEXT_PROBLEM].map((cycle) => [cycle.id, cycle]));

// O ciclo pronto de um item do menu (undefined se ainda não foi montado).
// usado em: private/presentation
export const getCycle = (id: string | null): Cycle | undefined => (id ? CYCLES[id] : undefined);

// O código-fonte de cada arquivo, carregado só quando a etapa é aberta (o Vite entrega o arquivo como texto).
const SOURCES = import.meta.glob(
  ["/src/actions/**/index.ts", "/src/contexts/**/index.tsx", "/src/service/*.ts", "/src/components/**/index.tsx", "/src/pages/private/**/index.tsx", "/src/pages/private/*.tsx", "/api/*.ts", "/api/_lib/*.ts"],
  { query: "?raw", import: "default" }
) as Record<string, () => Promise<string>>;

// O trecho de uma etapa, lido do arquivo real do projeto: carregando, pronto ou "não encontrado" (o código mudou).
// usado em: PresentationCycle
export type StepSnippet = { status: "loading" } | { status: "missing" } | { status: "ready"; snippet: Snippet };

// Como mostrar uma etapa na trilha: a escolhida, as que levam até ela, as que já passaram ou as que ainda vêm.
type NodeState = "current" | "ancestor" | "done" | "next";

// Uma etapa na trilha: o número (3, 3B, 3B.1), o caminho até ela e como mostrar.
// usado em: CycleTrail
export interface TrailNode {
  step: CycleStep;
  path: string[];
  label: string;
  state: NodeState;
}

// Uma linha da trilha: as etapas principais ou as de dentro da etapa escolhida (`parentLabel` diz de qual).
// usado em: CycleTrail
export interface TrailRow {
  parentLabel: string | null;
  nodes: TrailNode[];
}

const pathKey = (path: string[]): string => path.join("/");

// Todas as etapas na ordem em que são lidas (a etapa e, logo depois, o que tem dentro dela).
const flatten = (steps: CycleStep[], parent: string[] = []): { step: CycleStep; path: string[] }[] =>
  steps.flatMap((step) => {
    const path = [...parent, step.id];
    return [{ step, path }, ...flatten(step.children ?? [], path)];
  });

// A trilha para o caminho escolhido: sempre as etapas principais e, só se a etapa escolhida (ou uma que leva a ela) tem etapas dentro, uma linha com elas.
const buildRows = (steps: CycleStep[], path: string[]): TrailRow[] => {
  const order = new Map(flatten(steps).map((entry, index) => [pathKey(entry.path), index]));
  const selectedOrder = order.get(pathKey(path)) ?? 0;

  const stateOf = (nodePath: string[]): NodeState => {
    if (pathKey(nodePath) === pathKey(path)) return "current";
    if (nodePath.every((id, i) => path[i] === id)) return "ancestor";
    return (order.get(pathKey(nodePath)) ?? 0) < selectedOrder ? "done" : "next";
  };

  const rows: TrailRow[] = [];
  let level = steps;
  let parentLabel: string | null = null;

  for (let depth = 0; ; depth++) {
    const nodes: TrailNode[] = level.map((step, index) => {
      const nodePath = [...path.slice(0, depth), step.id];
      const label = depth === 0 ? String(index + 1) : depth === 1 ? `${parentLabel}${String.fromCharCode(65 + index)}` : `${parentLabel}.${index + 1}`;
      return { step, path: nodePath, label, state: stateOf(nodePath) };
    });
    rows.push({ parentLabel, nodes });

    const picked = nodes.find((node) => node.step.id === path[depth]);
    if (!picked?.step.children) break;
    parentLabel = picked.label;
    level = picked.step.children;
  }
  return rows;
};

// Estado de um ciclo na tela: o caminho da etapa escolhida (ex.: ["dashboard", "backend", "request"]), a trilha, o trecho dela e o anterior/próximo.
// usado em: PresentationCycle
export const useCycleView = (cycle: Cycle) => {
  const flat = useMemo(() => flatten(cycle.steps), [cycle]);
  const [path, setPath] = useState<string[]>([cycle.steps[0].id]);
  const [loaded, setLoaded] = useState<{ key: string; result: StepSnippet } | null>(null);

  const index = Math.max(0, flat.findIndex((entry) => pathKey(entry.path) === pathKey(path)));
  const step = flat[index].step;
  const key = pathKey(path);

  useEffect(() => {
    let cancelled = false;
    const load = SOURCES[`/${step.code.file}`];
    if (!load) {
      setLoaded({ key, result: { status: "missing" } });
      return;
    }
    load().then((source) => {
      if (cancelled) return;
      const snippet = extractSnippet(source, step.code);
      setLoaded({ key, result: snippet ? { status: "ready", snippet } : { status: "missing" } });
    });
    return () => {
      cancelled = true;
    };
  }, [step, key]);

  const snippet: StepSnippet = loaded && loaded.key === key ? loaded.result : { status: "loading" };
  const rows = useMemo(() => buildRows(cycle.steps, path), [cycle, path]);
  const label = rows.flatMap((row) => row.nodes).find((node) => node.state === "current")?.label ?? "";

  return {
    path,
    step,
    label,
    snippet,
    rows,
    select: setPath,
    hasPrevious: index > 0,
    hasNext: index < flat.length - 1,
    previous: () => setPath(flat[index - 1].path),
    next: () => setPath(flat[index + 1].path),
  };
};
