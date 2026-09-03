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
// qualquer página específica) — por isso gerencia o próprio estado de
// "já vi" (`fetchWatchedMap`/`setWatched`) em vez de receber isso via
// props de uma página; mesmo padrão que Timelines/Awards/Franchise já
// usam de forma independente.
import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { auth } from "@/service/FirebaseSettings";
import { posterUrl } from "@/service/TMDbSettings";
import { movieKey } from "@/service/TimelineSettings";
import { fetchWatchedMap, setWatched } from "@/service/WatchedSettings";
import { searchMovies, type DashboardMovie } from "@/pages/private/home/dashboard/functions";
import MovieDetail from "@/components/movieDetail";
import WatchButton from "@/components/watchButton";
import "./styles.scss";

interface SearchModalProps {
  onClose: () => void;
}

const SEARCH_LIMIT = 24;

const SearchModal = ({ onClose }: SearchModalProps) => {
  const uid = auth.currentUser?.uid ?? null;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DashboardMovie[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchedMap, setWatchedMapState] = useState<Map<string, number>>(new Map());
  const [selectedMovie, setSelectedMovie] = useState<{ id: number; mediaType: "movie" | "tv" } | null>(null);

  useEffect(() => {
    if (!uid) return;
    fetchWatchedMap(uid)
      .then(setWatchedMapState)
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err));
  }, [uid]);

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

  const handleToggleWatched = async (movie: DashboardMovie) => {
    if (!uid) return;
    const key = movieKey(movie.mediaType, movie.id);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMapState(nextMap);

    try {
      await setWatched(uid, key, nextWatched);
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setWatchedMapState(watchedMap); // desfaz
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
            {results.map((movie) => {
              const poster = posterUrl(movie.posterPath);
              const isWatched = watchedMap.has(movieKey(movie.mediaType, movie.id));

              return (
                <div key={movieKey(movie.mediaType, movie.id)} className="search-modal__result">
                  <button
                    type="button"
                    className="search-modal__result-open"
                    onClick={() => setSelectedMovie({ id: movie.id, mediaType: movie.mediaType })}
                  >
                    {poster ? (
                      <img src={poster} alt={movie.title} className="search-modal__poster" />
                    ) : (
                      <div className="search-modal__poster search-modal__poster--empty" />
                    )}
                    <span>{movie.title}</span>
                  </button>
                  <WatchButton isWatched={isWatched} onToggle={() => handleToggleWatched(movie)} disabled={!uid} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Intercepta o clique aqui — sem isso, fechar o MovieDetail (que
          também fecha ao clicar fora) borbulhava pro overlay deste modal
          e fechava os dois de uma vez só (mesmo cuidado de
          TimelineDetail/EditionDetail em outras partes do app). */}
      {selectedMovie && (
        <div onClick={(e) => e.stopPropagation()}>
          <MovieDetail id={selectedMovie.id} mediaType={selectedMovie.mediaType} onClose={() => setSelectedMovie(null)} />
        </div>
      )}
    </div>
  );
};

export default SearchModal;
