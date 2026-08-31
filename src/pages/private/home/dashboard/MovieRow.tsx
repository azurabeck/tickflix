// src/pages/private/home/dashboard/MovieRow.tsx
// Fileira de pôsteres reutilizada por "Últimos vistos", "Em cartaz em
// {cidade}" e "Campeões de bilheteria" — só muda o título e os itens.
// Chevron dos dois lados pra navegar (scroll suave, uma "página" de
// pôsteres por clique) — desabilitado de cada lado quando não tem mais
// filme pra ver naquela direção (`canScrollLeft`/`canScrollRight`,
// recalculado a cada scroll/resize/troca de itens).
//
// `id`/`mediaType` são OPCIONAIS — "Em cartaz" hoje vem do catálogo do
// ingresso.com (ver service/IngressoSettings.ts), que não tem id do
// TMDb nenhum; sem id/mediaType não dá pra calcular uma chave de "já
// vi" estável, então o <WatchButton/> some pra esses itens (não faz
// sentido de qualquer forma — "em cartaz" agora é sobre comprar
// ingresso, não marcar como visto). `posterUrl` (URL completa, ex.: CDN
// do próprio ingresso.com) tem prioridade sobre `posterPath` (fragmento
// do TMDb, resolvido aqui via posterUrl() do service) quando os dois
// vierem preenchidos.
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { movieKey } from "@/service/TimelineSettings";
import { posterUrl as resolveTmdbPosterUrl } from "@/service/TMDbSettings";
import WatchButton from "@/components/watchButton";

export interface MovieRowItem {
  id?: number;
  mediaType?: "movie" | "tv";
  title: string;
  posterPath?: string | null; // fragmento do TMDb — vira URL via resolveTmdbPosterUrl()
  posterUrl?: string | null; // URL já pronta (ex.: pôster do ingresso.com) — tem prioridade sobre posterPath
  href?: string; // link pronto pro onItemClick usar (ex.: página real do filme no ingresso.com)
  rankLabel?: string; // ex.: "1º lugar"/"Comprar ingresso"
}

interface MovieRowProps {
  title: string;
  items: MovieRowItem[];
  loading?: boolean;
  error?: string | null;
  watchedMap: Map<string, number>;
  uid: string | null;
  onItemClick: (item: MovieRowItem) => void;
  onToggleWatched: (item: MovieRowItem) => void;
}

// Quanto da largura visível anda por clique na seta — menos que 100% pra
// sempre sobrar um pedaço do pôster anterior visível, dá uma pista visual
// de que "veio de algum lugar" em vez de trocar a página inteira seca.
const SCROLL_STEP_RATIO = 0.85;

const MovieRow = ({ title, items, loading, error, watchedMap, uid, onItemClick, onToggleWatched }: MovieRowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // Quando cabe tudo sem precisar rolar (poucos itens), centraliza a
  // fileira em vez de deixar grudada na esquerda — só faz sentido rolar
  // (e então faz sentido ficar alinhado à esquerda) quando tem mais
  // filme do que cabe na tela.
  const [hasOverflow, setHasOverflow] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setHasOverflow(el.scrollWidth > el.clientWidth + 4);
  };

  // Recalcula quando os itens trocam (pôster carregado muda o
  // scrollWidth) e quando a janela redimensiona (muda o clientWidth).
  useEffect(() => {
    updateScrollState();
  }, [items]);

  useEffect(() => {
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, []);

  const scrollByStep = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * SCROLL_STEP_RATIO, behavior: "smooth" });
  };

  return (
    <section className="dashboard__row">
      <div className="dashboard__inner">
        <h2 className="dashboard__row-title">{title}</h2>

        {loading && <p className="dashboard__loading">Carregando...</p>}
        {error && <p className="dashboard__error">{error}</p>}

        {!loading && !error && (
          <div className="dashboard__row-content">
            <button
              type="button"
              className="dashboard__row-chevron dashboard__row-chevron--left"
              onClick={() => scrollByStep(-1)}
              disabled={!canScrollLeft}
              aria-label="Ver anteriores"
            >
              <ChevronLeft size={22} />
            </button>

            <div
              className={hasOverflow ? "dashboard__row-posters" : "dashboard__row-posters dashboard__row-posters"}
              ref={scrollRef}
              onScroll={updateScrollState}
            >
              {items.map((item, index) => {
                const poster = item.posterUrl ?? resolveTmdbPosterUrl(item.posterPath ?? null);
                const hasIdentity = item.id !== undefined && item.mediaType !== undefined;
                const isWatched = hasIdentity && watchedMap.has(movieKey(item.mediaType!, item.id!));

                return (
                  <div key={item.id ?? `${item.title}-${index}`} className="dashboard__row-item">
                    <button type="button" className="dashboard__row-item-open" onClick={() => onItemClick(item)}>
                      {poster ? (
                        <img src={poster} alt={item.title} className="dashboard__row-poster" />
                      ) : (
                        <div className="dashboard__row-poster dashboard__row-poster--empty" />
                      )}
                      {item.rankLabel && <span className="dashboard__row-rank">{item.rankLabel}</span>}
                    </button>
                    {hasIdentity && <WatchButton isWatched={isWatched} onToggle={() => onToggleWatched(item)} disabled={!uid} />}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="dashboard__row-chevron dashboard__row-chevron--right"
              onClick={() => scrollByStep(1)}
              disabled={!canScrollRight}
              aria-label="Ver próximos"
            >
              <ChevronRight size={22} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default MovieRow;
