// src/pages/private/awards/index.tsx
// Componente genérico de premiação — generalização de
// pages/private/oscar/index.tsx (ver documents.md pra história completa)
// pra funcionar com qualquer uma das 3 premiações da nav (Oscar/Globo de
// Ouro/Cannes) via `AwardConfig` (awardConfigs.ts). As 3 rotas
// (ROUTES.OSCAR/GOLDEN_GLOBES/CANNES) renderizam esse MESMO componente,
// só passando a config diferente — nada específico de uma premiação vive
// aqui, tudo que muda está em awardConfigs.ts.
//
// Abre com a grade de todas as edições (getAwardEditions, ver
// functions.ts) → clicar numa edição mostra as categorias com os
// indicados (vencedor primeiro) → clicar num indicado abre o detalhe
// (dialog). Navegação por estado local (sem rota por edição/:ano por
// enquanto).
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import MovieDetail from "@/components/movieDetail";
import { auth } from "@/service/FirebaseSettings";
import { fetchWatchedMap, setWatched } from "@/service/WatchedSettings";
import type { AwardConfig } from "./awardConfigs";
import {
  fetchAllSavedAwardEditions,
  fetchAwardEditionFromFirestore,
  getAwardEditions,
  awardNomineeKey,
  type AwardCategory,
  type AwardEdition,
  type AwardNominee,
} from "./functions";
import { syncAwardTimeline } from "./timelineSync";
import AddDataModal from "./AddDataModal";
import EditionGrid from "./EditionGrid";
import EditionDetail from "./EditionDetail";
import "./styles.scss";

interface AwardPageProps {
  config: AwardConfig;
}

const AwardPage = ({ config }: AwardPageProps) => {
  const uid = auth.currentUser?.uid ?? null;
  const [editions, setEditions] = useState<AwardEdition[]>(() => getAwardEditions(config));
  const [selectedOrdinal, setSelectedOrdinal] = useState<number | null>(null);
  // Detalhe do indicado abre o MESMO modal global usado em todo canto do
  // app (@/components/movieDetail — timeline, últimos vistos, em cartaz,
  // busca) — componente global, nunca um layout próprio de premiação.
  const [selectedNominee, setSelectedNominee] = useState<AwardNominee | null>(null);
  const [addDataOpen, setAddDataOpen] = useState(false);

  const selectedEdition = editions.find((e) => e.ordinal === selectedOrdinal) ?? null;

  // "Já vi" — estado GLOBAL por filme (service/WatchedSettings.ts), não
  // uma marcação própria dessa página: o mesmo filme, se estiver numa
  // timeline do usuário (dessa premiação ou de outra), compartilha essa
  // mesma marcação. Otimista no toggle, desfaz se a gravação falhar.
  const [watchedMap, setWatchedMapState] = useState<Map<string, number>>(new Map());

  // Trocar de premiação (Oscar → Globo de Ouro, ex.) é o MESMO componente
  // React, então o estado local não reseta sozinho — precisa reagir à
  // troca de `config` explicitamente.
  useEffect(() => {
    setEditions(getAwardEditions(config));
    setSelectedOrdinal(null);
    setSelectedNominee(null);
    setAddDataOpen(false);
  }, [config]);

  useEffect(() => {
    if (!uid) return;
    fetchWatchedMap(uid)
      .then(setWatchedMapState)
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err));
  }, [uid]);

  // Uma leitura só da collection inteira, na entrada da página — é o que
  // faz a GRADE já abrir mostrando o vencedor de quem já foi resolvido.
  useEffect(() => {
    fetchAllSavedAwardEditions(config)
      .then((saved) => {
        if (saved.size === 0) return;
        setEditions((prev) =>
          prev.map((edition) => {
            const match = saved.get(edition.ordinal);
            return match ? { ...edition, headline: match.headline, categories: match.categories } : edition;
          })
        );
      })
      .catch((err) => console.error(`Erro ao buscar edições do ${config.name} já resolvidas:`, err));
  }, [config]);

  // Edição sem dado ainda — tenta achar já salva no Firestore (de uma
  // sessão anterior de "Adicionar dados"). Se não achar, fica null
  // mesmo, o botão "Adicionar dados" cobre isso.
  useEffect(() => {
    if (selectedOrdinal === null) return;
    const current = editions.find((e) => e.ordinal === selectedOrdinal);
    if (current?.categories) return;

    fetchAwardEditionFromFirestore(config, selectedOrdinal)
      .then((saved) => {
        if (!saved) return;
        setEditions((prev) =>
          prev.map((e) => (e.ordinal === selectedOrdinal ? { ...e, headline: saved.headline, categories: saved.categories } : e))
        );
      })
      .catch((err) => console.error(`Erro ao buscar edição do ${config.name} no Firestore:`, err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrdinal, config]);

  const handleToggleWatched = async (nominee: AwardNominee) => {
    if (!uid) return;
    const key = awardNomineeKey(nominee);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMapState(nextMap);

    try {
      await setWatched(uid, key, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setWatchedMapState(watchedMap); // desfaz — volta pro estado de antes do clique
      return;
    }

    // Garante que o filme está numa timeline de verdade do usuário (uma
    // por prêmio+edição, criada na hora do primeiro "já vi" dela).
    // Best-effort: se falhar, o "já vi" já foi gravado, só não garantiu a
    // timeline dessa vez.
    if (selectedEdition) {
      syncAwardTimeline(uid, config, selectedEdition).catch((err) => console.error(`Erro ao sincronizar timeline da edição do ${config.name}:`, err));
    }
  };

  const handleDataSaved = (headline: string, categories: AwardCategory[]) => {
    if (!selectedEdition) return;
    setEditions((prev) => prev.map((e) => (e.ordinal === selectedEdition.ordinal ? { ...e, headline, categories } : e)));
    setAddDataOpen(false);
  };

  return (
    <div className="awards" style={{ "--awards-accent": config.accentColor } as React.CSSProperties}>
      <div className="awards__inner">
        {selectedEdition ? (
          <EditionDetail
            config={config}
            edition={selectedEdition}
            watchedMap={watchedMap}
            uid={uid}
            onBack={() => setSelectedOrdinal(null)}
            onSelectNominee={(_categoryName, nominee) => setSelectedNominee(nominee)}
            onToggleWatched={handleToggleWatched}
            onOpenAddData={() => setAddDataOpen(true)}
          />
        ) : (
          <>
            <h1 className="awards__title">{config.name}</h1>
            <p className="awards__subtitle">Todas as edições, do vencedor ao último indicado.</p>
            <EditionGrid editions={editions} onSelect={(edition) => setSelectedOrdinal(edition.ordinal)} />
          </>
        )}
      </div>

      {selectedNominee && selectedNominee.tmdbId !== null && (
        <MovieDetail id={selectedNominee.tmdbId} mediaType={selectedNominee.mediaType} onClose={() => setSelectedNominee(null)} />
      )}

      {/* Indicado sem tmdbId cadastrado — não dá pra abrir o modal de
          detalhes de verdade (ele precisa de um id do TMDb pra buscar
          algo). Mesmo chrome de overlay/painel do modal global
          (movie-detail__*, já carregado pelo import acima), só com uma
          mensagem em vez do detalhe. */}
      {selectedNominee && selectedNominee.tmdbId === null && (
        <div className="movie-detail__overlay" onClick={() => setSelectedNominee(null)}>
          <div className="movie-detail__panel awards__detail-missing-panel" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="movie-detail__close" onClick={() => setSelectedNominee(null)} aria-label="Fechar">
              <X size={20} />
            </button>
            <p>
              <strong>{selectedNominee.filmTitle}</strong> não tem um tmdbId cadastrado — edite os dados dessa edição
              pra adicionar (é o que permite buscar os detalhes reais no TMDb).
            </p>
          </div>
        </div>
      )}

      {addDataOpen && selectedEdition && (
        <AddDataModal config={config} edition={selectedEdition} onClose={() => setAddDataOpen(false)} onSaved={handleDataSaved} />
      )}
    </div>
  );
};

export default AwardPage;
