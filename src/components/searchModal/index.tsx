// src/components/searchModal/index.tsx
// Modal GLOBAL de busca — ícone de lupa na navbar (@/components/appNav)
// abre esse modal. Consolida os 3 rodapés de busca que existiam antes,
// um por página (Filmes/Séries/Animes, cada um com input+resultado
// próprio) — pedido explícito da Rebecca: "essa barra de search que a
// gente tem no final das páginas filmes/séries/animes pode sair dali e
// virar só um ícone de lupa no navbar, quando o usuário clica, então
// aparece o modal pra ele fazer a busca".
//
// Busca UMA vez, pra tudo — `searchMovies` (home/dashboard/functions.ts,
// `/search/multi` do TMDb) já cobre filme E série/anime juntos, mesmo
// motor que já existia na Home. As páginas de Séries/Animes tinham as
// próprias `searchSeries`/`searchAnime` (removidas, eram só `/search/tv`
// SEM filtro nenhum de anime — comentário que existia ali: "Igual
// searchSeries — NÃO filtra por anime, mesma decisão da página Séries")
// — ou seja, nenhum comportamento de verdade se perde virando uma busca
// só; ganha-se só o fato de "filme" também aparecer buscando de dentro de
// Séries/Animes, o que é uma melhoria, não uma regressão.
//
// Componente GLOBAL (renderizado por @/components/appNav, fora de
// qualquer página específica). Os resultados são o CARD GLOBAL
// (@/components/mediaCard) — filme vira o card `movie`, série/anime o card
// `serie` — e o estado deles (assistido/seguindo, nota, trailer, detalhe)
// vem do MediaCardsProvider.
import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard, type MediaItem } from "@/components/mediaCard";
import { searchMovies, type DashboardMovie } from "@/pages/private/home/dashboard/functions";
import "./styles.scss";

interface SearchModalProps {
  onClose: () => void;
}

const SEARCH_LIMIT = 24;

const SearchModal = ({ onClose }: SearchModalProps) => {
  const media = useMediaCards();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardMovie[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items: MediaItem[] = (results ?? []).map((movie) => ({ id: movie.id, mediaType: movie.mediaType, title: movie.title, posterPath: movie.posterPath }));
  const open = useOpenCard(items);

  useEffect(() => {
    if (results && results.length > 0) media.loadAvailability(results);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;

    setLoading(true);
    setError(null);
    try {
      setResults(await searchMovies(q, SEARCH_LIMIT));
    } catch (err) {
      console.error("Erro na busca:", err);
      setError("Não foi possível buscar agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-modal__overlay" onClick={onClose}>
      <div className="search-modal__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="search-modal__close" onClick={onClose} aria-label="Fechar">
          <X size={20} />
        </button>

        <div className="search-modal__bar">
          <input
            type="text"
            className="search-modal__input"
            placeholder="Procurar filme ou série"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            autoFocus
          />
          <button type="button" className="search-modal__button" onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="search-modal__spinner" size={16} /> : <Search size={16} />}
          </button>
        </div>

        {error && <p className="search-modal__error">{error}</p>}

        {results && (
          <div className="search-modal__results">
            {results.length === 0 && <p className="search-modal__empty">Nada encontrado.</p>}
            <div className="media-grid media-grid--modal media-grid--scroll">
              {items.map((item, index) => {
                const id = cardKey(item, index);
                return <ConnectedMediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default SearchModal;
