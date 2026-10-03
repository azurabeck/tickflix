// src/pages/private/home/dashboard/useResolvedTitles.ts
// Resolve título/imagem de uma lista de chaves de "já vi" (`movie-123`,
// `tv-45`) no TMDb — a collection users/{uid}/watched só guarda a chave
// e a nota, nunca título/pôster (ver service/WatchedSettings.ts). Usado
// por "Seu Rank" e pela sugestão da IA. `fetchTitleById` já tem memo
// (service/TMDbSettings.ts), então reabrir a Home não refaz as chamadas.
import { useEffect, useState } from "react";
import { fetchTitleById, type ResolvedTitle } from "@/service/TMDbSettings";

const parseKey = (key: string): { mediaType: "movie" | "tv"; id: number } | null => {
  const [mediaType, idText] = key.split("-");
  const id = Number(idText);
  if ((mediaType !== "movie" && mediaType !== "tv") || !Number.isFinite(id)) return null;
  return { mediaType, id };
};

// `ready` = a resolução da lista ATUAL de chaves terminou (sucesso ou falha
// de cada uma) — quem depende de todos os títulos (a IA) espera isso.
export const useResolvedTitles = (keys: string[]): { titles: Map<string, ResolvedTitle>; ready: boolean } => {
  const [resolved, setResolved] = useState<Map<string, ResolvedTitle>>(new Map());
  const [settledSignature, setSettledSignature] = useState<string | null>(null);
  const signature = keys.join("|");

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      keys.map(async (key): Promise<[string, ResolvedTitle] | null> => {
        const parsed = parseKey(key);
        if (!parsed) return null;
        const title = await fetchTitleById(parsed.mediaType, parsed.id);
        return title ? [key, title] : null;
      })
    ).then((entries) => {
      if (cancelled) return;
      setResolved(new Map(entries.filter((entry): entry is [string, ResolvedTitle] => entry !== null)));
      setSettledSignature(signature);
    });
    return () => {
      cancelled = true;
    };
    // `signature` representa `keys` (um array novo a cada render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  return { titles: resolved, ready: settledSignature === signature };
};
