// src/pages/private/series/SeriesRow.tsx
// Fileira de pôsteres de série — chevrons dos dois lados, "página" por
// clique, centraliza quando cabe tudo sem precisar rolar (mecânica de
// scroll em ScrollableRow.tsx, extraída daqui pra reuso — a grade
// "Minhas séries" em index.tsx usa o mesmo componente agora). Fica na
// própria página (não em @/components) seguindo a mesma convenção do
// resto do app — cada página tem seus componentes de grade/fileira
// próprios (ex.: EditionGrid em pages/private/oscar), não um componente
// genérico compartilhado entre páginas.
//
// Diferente de MovieRow, aqui cada pôster tem o botão de "adicionar às
// minhas séries" — não o @/components/watchButton global de "já vi". O
// que importa nessa página é entrar na lista de acompanhamento, que é o
// que libera marcar episódio por episódio (SeriesDetail.tsx); o boolean
// genérico de "já vi" a série inteira não faz o que a Rebecca pediu.
//
// Reusado inteiro pela página Animes (@/pages/private/anime/index.tsx —
// "mesma lógica e layout", pedido explícito da Rebecca) — esse
// componente não sabe a diferença entre série e anime, só renderiza o
// que recebe; `addLabel`/`removeLabel` deixam o texto do botão certo em
// cada página sem precisar duplicar o componente inteiro.
import { Check, Loader2, Plus, Star } from "lucide-react";
import { posterUrl } from "@/service/TMDbSettings";
import { countryFlagEmoji, type SeriesRowItem } from "./functions";
import ScrollableRow from "./ScrollableRow";

interface SeriesRowProps {
  title: string;
  items: SeriesRowItem[];
  loading?: boolean;
  error?: string | null;
  addedIds: Set<number>;
  pendingIds: Set<number>;
  uid: string | null;
  onItemClick: (item: SeriesRowItem) => void;
  onToggleAdded: (item: SeriesRowItem) => void;
  addLabel?: string;
  removeLabel?: string;
}

const SeriesRow = ({
  title,
  items,
  loading,
  error,
  addedIds,
  pendingIds,
  uid,
  onItemClick,
  onToggleAdded,
  addLabel = "Adicionar às minhas séries",
  removeLabel = "Remover das minhas séries",
}: SeriesRowProps) => (
  <section className="series-page__row">
    <div className="series-page__inner">
      <h2 className="series-page__row-title">{title}</h2>

      {loading && <p className="series-page__loading">Carregando...</p>}
      {error && <p className="series-page__error">{error}</p>}
      {!loading && !error && items.length === 0 && <p className="series-page__empty">Nada encontrado.</p>}

      {!loading && !error && items.length > 0 && (
        <ScrollableRow itemsKey={items}>
          {items.map((item, index) => {
            const poster = posterUrl(item.posterPath);
            const isAdded = addedIds.has(item.id);
            const isPending = pendingIds.has(item.id);
            const flag = countryFlagEmoji(item.originCountry);

            return (
              <div key={item.id} className="series-page__row-item">
                <button type="button" className="series-page__row-item-open" onClick={() => onItemClick(item)}>
                  <span className="series-page__row-rank">{index + 1}º</span>
                  {poster ? (
                    <img src={poster} alt={item.title} className="series-page__row-poster" />
                  ) : (
                    <div className="series-page__row-poster series-page__row-poster--empty" />
                  )}
                  <span className="series-page__row-title-text">{item.title}</span>
                  <span className="series-page__row-rating">
                    <Star size={11} fill="currentColor" />
                    {item.voteAverage.toFixed(1)}
                    {flag && <span className="series-page__row-flag">{flag}</span>}
                  </span>
                </button>
                <button
                  type="button"
                  className={isAdded ? "series-page__add-btn series-page__add-btn--active" : "series-page__add-btn"}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleAdded(item);
                  }}
                  disabled={!uid || isPending}
                  title={isAdded ? removeLabel : addLabel}
                  aria-label={isAdded ? removeLabel : addLabel}
                >
                  {isPending ? <Loader2 className="series-page__spinner" size={14} /> : isAdded ? <Check size={14} /> : <Plus size={14} />}
                </button>
              </div>
            );
          })}
        </ScrollableRow>
      )}
    </div>
  </section>
);

export default SeriesRow;
