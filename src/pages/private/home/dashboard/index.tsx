// src/pages/private/home/dashboard/index.tsx
// Home de verdade — sem wizard: criação de timeline é só pelo painel
// "Criar uma nova timeline" (texto livre). Layout full-bleed: cada seção
// ocupa 100% da largura da tela com a própria cor de fundo (nada de caixa
// estreita flutuando numa tela grande) — só o CONTEÚDO de cada seção fica
// limitado por dentro (.dashboard__inner, ver styles.scss), pra não virar
// uma linha de texto esticada de ponta a ponta num monitor grande. Ordem:
// carrossel de trailers (esse sim edge-to-edge, sem inner) dos filmes EM
// CARTAZ (pedido explícito da Rebecca: "os filmes que estamos exibindo são
// referente aos campeões de bilheteria... vamos mudar para mostrar os
// filmes em cartaz" — trailer vem dos mesmos filmes resolvidos pra fileira
// "Em cartaz em {cidade}" abaixo, não uma busca própria, ver
// `loadHeroTrailers` mais abaixo), painel de criação, "Últimos vistos"
// (Firestore), "Em cartaz em {cidade}" e "Campeões de bilheteria" (TMDb),
// rodapé só com a Logo (busca saiu daqui, virou o ícone de lupa global da
// navbar, ver @/components/searchModal). A nav é global agora
// (@/components/appNav, renderizada por PrivateLayout) — não vive mais
// aqui; a grade "Minhas timelines" também saiu daqui, virou a página
// própria @/pages/private/timelines.
import { useEffect, useState } from "react";
import Logo from "@/components/logo";
import MovieDetail from "@/components/movieDetail";
import { fetchTimelines, movieKey, type Timeline } from "@/service/TimelineSettings";
import { buildIngressoMovieUrl, slugify } from "@/service/IngressoSettings";
import { fetchCurrentCityName } from "@/service/LocationSettings";
import { fetchWatchedMap, setWatched } from "@/service/WatchedSettings";
import TimelineDetail from "@/pages/private/timelines/TimelineDetail";
import {
  getRecentlyWatched,
  fetchIngressoNowPlayingResolved,
  fetchNowPlayingBrazil,
  fetchBoxOfficeChampions,
  fetchHeroTrailers,
  type DashboardMovie,
  type HeroTrailer,
} from "./functions";
import CreateTimelinePanel from "./CreateTimelinePanel";
import FollowedTimelinesRow from "./FollowedTimelinesRow";
import HeroCarousel from "./HeroCarousel";
import MovieRow, { type MovieRowItem } from "./MovieRow";
import "./styles.scss";

interface DashboardProps {
  uid: string | null;
}

const RECENT_LIMIT = 8;
const ROW_LIMIT = 8;
// "Campeões de bilheteria" é especificamente um TOP 20 do ano — pedido
// explícito da Rebecca — não o mesmo ROW_LIMIT=8 genérico das outras
// fileiras.
const BOX_OFFICE_LIMIT = 20;
// "Em cartaz" tem que trazer TODOS os filmes que estão na página real do
// ingresso.com (pedido explícito: "não ta trazendo todos os filmes em
// cartaz"), não só os primeiros 8 como o resto das fileiras — a página
// deles hoje costuma ter só entre 20 e 35 títulos, então esse teto é só
// uma rede de segurança contra a lista deles crescer descontroladamente
// um dia, não um corte de verdade na prática.
const INGRESSO_LIMIT = 40;

const Dashboard = ({ uid }: DashboardProps) => {
  // "Já vi" é estado global por filme (service/WatchedSettings.ts,
  // users/{uid}/watched) — usado aqui só pra colorir o ícone de bookmark
  // de cada card (`.has(key)`).
  const [watchedMap, setWatchedMap] = useState<Map<string, number>>(new Map());
  // "Últimos vistos" é uma query própria (fetchRecentlyWatchedKeys,
  // ordenada por watchedAt) + resolução no TMDb pela chave — não deriva
  // do Map acima. Recarrega a cada toggle (loadRecentlyWatched).
  const [recentlyWatched, setRecentlyWatched] = useState<DashboardMovie[]>([]);

  const [heroTrailers, setHeroTrailers] = useState<HeroTrailer[]>([]);
  // "Em cartaz" — lista de VERDADE do ingresso.com (quais filmes) pra
  // cidade atual do usuário, com cada título resolvido no TMDb
  // (fetchIngressoNowPlayingResolved, functions.ts) pra ter o mesmo
  // pôster/mesmo botão "já vi" das outras fileiras. Fallback pro
  // now_playing do TMDb (lista genérica, não real por cidade) se a busca
  // no ingresso.com falhar por qualquer motivo (geolocation negada, o
  // leitor de terceiro fora do ar, formato da página deles mudou etc.) —
  // MovieRowItem já normaliza os dois formatos.
  const [nowPlaying, setNowPlaying] = useState<MovieRowItem[] | null>(null);
  const [nowPlayingError, setNowPlayingError] = useState<string | null>(null);
  const [boxOffice, setBoxOffice] = useState<DashboardMovie[] | null>(null);
  const [boxOfficeError, setBoxOfficeError] = useState<string | null>(null);

  const [selectedMovie, setSelectedMovie] = useState<{ id: number; mediaType: "movie" | "tv" } | null>(null);

  // "Em cartaz {cidade}" — geolocation do navegador + reverse geocoding
  // (service/LocationSettings.ts). Cai pro texto "Brazil" de sempre se o
  // usuário negar a permissão/geolocation não disponível.
  const [cityName, setCityName] = useState<string | null>(null);

  // Timelines seguidas (estrela no card, ver @/pages/private/timelines) —
  // aparecem aqui, abrem o mesmo TimelineDetail da página Timelines.
  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  const loadRecentlyWatched = () => {
    if (!uid) return;
    getRecentlyWatched(uid, RECENT_LIMIT)
      .then(setRecentlyWatched)
      .catch((err) => console.error("Erro ao buscar últimos vistos:", err));
  };

  useEffect(() => {
    if (!uid) return;
    fetchWatchedMap(uid)
      .then(setWatchedMap)
      .catch((err) => console.error("Erro ao buscar filmes vistos:", err));
    loadRecentlyWatched();
    // Categoria "filmes" só — pedido explícito da Rebecca: a mesma
    // fileira na página Séries mostra só as de categoria "series"
    // (@/pages/private/series/index.tsx), resolvendo de vez a
    // categorização que tinha ficado pendente.
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("filmes"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  useEffect(() => {
    // Trailers do carrossel vêm de TODOS os filmes "em cartaz" resolvidos
    // abaixo (nunca uma busca própria) — pedido explícito da Rebecca:
    // "os filmes que estamos exibindo são referente aos campeões de
    // bilheteria... vamos mudar para mostrar os filmes em cartaz", depois
    // "colocar o trailer de todos os filmes em cartaz". Sem limite
    // (`HERO_LIMIT` saiu daqui) — confirmado com ela que isso não pesa o
    // site: o `HeroCarousel` só monta UM `<iframe>` por vez (o slide
    // atual, ver HeroCarousel.tsx), não importa quantos itens tenham na
    // lista. O único custo real é resolver qual filme TEM trailer
    // (`fetchHeroTrailers`, uma chamada `/movie/{id}/videos` por filme,
    // todas em paralelo no carregamento da página, não uma por slide) —
    // aceitável, mesmo raciocínio de "TMDb aguenta isso, quem limita
    // abuso é o rate limit dele" já usado em service/TMDbSettings.ts.
    // Só filme com `id` resolvido no TMDb entra (item do ingresso.com
    // sem match no TMDb, ver functions.ts, não tem trailer possível).
    const loadHeroTrailers = (movies: MovieRowItem[]) => {
      const withId = movies.filter((m): m is MovieRowItem & { id: number } => m.id !== undefined);
      fetchHeroTrailers(withId)
        .then(setHeroTrailers)
        .catch((err) => console.error("Erro ao buscar trailers do topo:", err));
    };

    const loadNowPlaying = async () => {
      // 1) tenta a lista REAL do ingresso.com pra cidade do usuário —
      // pedido explícito da Rebecca: "os filmes que estão em cartaz não
      // são os que estão mostrando lá na ingresso.com... o que deve
      // estar ali na nossa lista são os mesmos filmes" + "a localização
      // tem que estar certa quando for ver o em cartaz na ingresso.com".
      try {
        const city = await fetchCurrentCityName();
        setCityName(city);
        if (!city) throw new Error("Localização não disponível.");

        // Lista real do ingresso.com, já com cada título resolvido no
        // TMDb (mesmo pôster/mesmo botão "já vi" do resto do app — ver
        // fetchIngressoNowPlayingResolved em functions.ts).
        const movies = await fetchIngressoNowPlayingResolved(slugify(city), INGRESSO_LIMIT);
        setNowPlaying(movies);
        loadHeroTrailers(movies);
        return;
      } catch (err) {
        console.error("Erro ao buscar em cartaz do ingresso.com, caindo pro TMDb:", err);
      }

      // 2) fallback: now_playing do TMDb (nacional, não da cidade de
      // verdade — ver documents.md) com link adivinhado (pode falhar
      // pra filme com sufixo que só o ingresso.com sabe, tipo
      // relançamento).
      try {
        const fallback = await fetchNowPlayingBrazil(ROW_LIMIT);
        const mapped = fallback.map((movie) => ({
          id: movie.id,
          mediaType: movie.mediaType,
          title: movie.title,
          posterPath: movie.posterPath,
          href: buildIngressoMovieUrl(movie.title),
          rankLabel: "Comprar ingresso",
        }));
        setNowPlaying(mapped);
        loadHeroTrailers(mapped);
      } catch (fallbackErr) {
        console.error("Erro ao buscar em cartaz (fallback TMDb):", fallbackErr);
        setNowPlayingError("Não foi possível carregar os filmes em cartaz.");
      }
    };

    loadNowPlaying();

    fetchBoxOfficeChampions(BOX_OFFICE_LIMIT)
      .then(setBoxOffice)
      .catch((err) => {
        console.error("Erro ao buscar bilheteria:", err);
        setBoxOfficeError("Não foi possível carregar os campeões de bilheteria.");
      });
  }, []);

  // Toggle "já vi" de qualquer card de filme da home (fileiras) — mesmo
  // estado global usado pelas timelines e pela página Oscar
  // (service/WatchedSettings.ts), não é algo próprio daqui.
  // id/mediaType opcionais pra aceitar MovieRowItem (item sem identidade
  // TMDb, ex.: "Em cartaz" vindo do ingresso.com, nunca chama isso de
  // verdade — MovieRow só renderiza o WatchButton quando os dois existem).
  const handleToggleWatched = async (item: { id?: number; mediaType?: "movie" | "tv" }) => {
    if (!uid || item.id === undefined || !item.mediaType) return;
    const key = movieKey(item.mediaType, item.id);
    const nextWatched = !watchedMap.has(key);

    const nextMap = new Map(watchedMap);
    if (nextWatched) nextMap.set(key, Date.now());
    else nextMap.delete(key);
    setWatchedMap(nextMap);

    try {
      await setWatched(uid, key, nextWatched);
      loadRecentlyWatched(); // "Últimos vistos" é query própria, recarrega pra refletir o toggle
    } catch (err) {
      console.error("Erro ao marcar filme como visto:", err);
      setWatchedMap(watchedMap); // desfaz
    }
  };

  return (
    <div className="dashboard">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel uid={uid} />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={watchedMap} onSelect={setSelectedTimeline} />

      {recentlyWatched.length > 0 && (
        <MovieRow
          title="Últimos vistos"
          items={recentlyWatched.map((movie) => ({
            id: movie.id,
            mediaType: movie.mediaType,
            title: movie.title,
            posterPath: movie.posterPath,
          }))}
          watchedMap={watchedMap}
          uid={uid}
          onItemClick={(item: MovieRowItem) => item.id !== undefined && item.mediaType && setSelectedMovie({ id: item.id, mediaType: item.mediaType })}
          onToggleWatched={handleToggleWatched}
        />
      )}

      <MovieRow
        title={cityName ? `Em cartaz em ${cityName}` : "Em cartaz Brazil"}
        items={nowPlaying ?? []}
        loading={nowPlaying === null && !nowPlayingError}
        error={nowPlayingError}
        watchedMap={watchedMap}
        uid={uid}
        // "Em cartaz" é justamente onde faz sentido ir direto comprar
        // ingresso — pedido explícito da Rebecca: "quando a gente clicar
        // abre as sessões do filme lá na ingresso.com". Só essa fileira
        // muda o clique principal; as outras continuam abrindo
        // MovieDetail normalmente. `item.href` já vem certo (slug real
        // do ingresso.com quando a lista veio de lá) — o fallback só
        // entra se por acaso faltar (não devia acontecer na prática).
        onItemClick={(item: MovieRowItem) => window.open(item.href ?? buildIngressoMovieUrl(item.title), "_blank", "noopener,noreferrer")}
        onToggleWatched={handleToggleWatched}
      />

      <MovieRow
        title="Campeões de bilheteria 2026"
        items={(boxOffice ?? []).map((movie, index) => ({
          id: movie.id,
          mediaType: movie.mediaType,
          title: movie.title,
          posterPath: movie.posterPath,
          rankLabel: `${index + 1}º lugar`,
        }))}
        loading={boxOffice === null && !boxOfficeError}
        error={boxOfficeError}
        watchedMap={watchedMap}
        uid={uid}
        onItemClick={(item: MovieRowItem) => item.id !== undefined && item.mediaType && setSelectedMovie({ id: item.id, mediaType: item.mediaType })}
        onToggleWatched={handleToggleWatched}
      />

      {/* Busca saiu daqui — virou o ícone de lupa global da navbar
          (@/components/appNav → @/components/searchModal), pedido
          explícito da Rebecca: "essa barra de search que a gente tem no
          final das páginas filmes/séries/animes pode sair dali e virar
          só um ícone de lupa no navbar". Rodapé com a Logo continua, só
          como assinatura da marca no fim da página. */}
      <footer className="dashboard__footer">
        <div className="dashboard__inner dashboard__footer-inner">
          <Logo />
        </div>
      </footer>

      {selectedMovie && (
        <MovieDetail
          id={selectedMovie.id}
          mediaType={selectedMovie.mediaType}
          onClose={() => setSelectedMovie(null)}
        />
      )}

      {selectedTimeline && (
        <TimelineDetail
          timeline={selectedTimeline}
          watchedMap={watchedMap}
          uid={uid}
          onClose={() => setSelectedTimeline(null)}
          onToggleWatched={handleToggleWatched}
        />
      )}
    </div>
  );
};

export default Dashboard;
