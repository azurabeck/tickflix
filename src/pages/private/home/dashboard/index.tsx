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
// sem rodapé (a busca saiu daqui e virou o ícone de lupa global da navbar,
// ver @/components/searchModal; o rodapé com a Logo foi removido a pedido
// da Rebecca: "serve pra nada"). A nav é global agora
// (@/components/appNav, renderizada por PrivateLayout) — não vive mais
// aqui; a grade "Minhas timelines" também saiu daqui, virou a página
// própria @/pages/private/timelines.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageLoader from "@/components/pageLoader";
import { useMediaCards } from "@/components/mediaCard";
import { fetchTimelines, type Timeline } from "@/service/TimelineSettings";
import { slugify } from "@/service/IngressoSettings";
import { fetchCurrentCityName } from "@/service/LocationSettings";
import { consumeRefreshRequest, getPageCache, setPageCache } from "@/service/PageCache";
import { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "@/service/i18n";
import TimelineDetail from "@/pages/private/timelines/TimelineDetail";
import {
  type DashboardMovie,
  type HeroTrailer,
  type MajorReleaseMovie,
} from "./functions";
import CreateTimelinePanel from "./CreateTimelinePanel";
import FollowedTimelinesRow from "./FollowedTimelinesRow";
import HeroCarousel from "./HeroCarousel";
import MajorReleasesModal from "./MajorReleasesModal";
import type { MovieRowItem } from "./types";
import { NowPlayingSection, RecentlyWatchedSection, ReleasesSection, openOnIngresso } from "./PosterSections";
import { PosterGridModal, RecentlyWatchedModal } from "./PosterGridModal";
import RankSection from "./RankSection";
import { HomeGroup } from "./HomeGroup";
import "./styles.scss";
import "./home.scss";

interface DashboardProps {
  uid: string | null;
}

// Formato de GET /api/dashboard (api/dashboard.ts). Os `*Failed` do
// backend não são usados aqui: `null` na lista já significa falha.
interface DashboardMainResponse {
  nowPlaying: MovieRowItem[] | null;
  heroTrailers: HeroTrailer[];
  boxOffice: DashboardMovie[] | null;
}

// Cópia local (service/PageCache.ts, 7 dias) da parte "main" — guarda a
// cidade com que foi buscada, já que "em cartaz" depende dela. Sem isso,
// toda vez que se sai da Home e volta o componente remonta do zero e
// refaz o load geral à toa.
interface CachedMain {
  city: string | null;
  nowPlaying: MovieRowItem[];
  heroTrailers: HeroTrailer[];
  boxOffice: DashboardMovie[];
}

const mainCacheKey = (lang: string) => `dashboard-main:v2:${lang}`;
const releasesCacheKey = (lang: string) => `dashboard-releases:v2:${lang}`;

interface DashboardReleasesResponse {
  majorReleasesFull: MajorReleaseMovie[] | null;
}

// Última cidade resolvida via geolocation — deixa a Home chamar o backend
// sem esperar o GPS do navegador a cada visita.
const CITY_STORAGE_KEY = "tickflix-last-city";

const readRememberedCity = (): string | null => {
  try {
    return localStorage.getItem(CITY_STORAGE_KEY);
  } catch {
    return null;
  }
};

const rememberCity = (city: string): void => {
  try {
    localStorage.setItem(CITY_STORAGE_KEY, city);
  } catch {
    // localStorage indisponível
  }
};

const Dashboard = ({ uid }: DashboardProps) => {
  const { t, i18n } = useTranslation();
  const lang = TMDB_LANGUAGE_BY_APP_LANGUAGE[(i18n.language ?? "pt").slice(0, 2) as SupportedLanguage] ?? "pt-BR";
  // Lido UMA vez no mount, pros estados abaixo já nascerem preenchidos —
  // sem isso a Home piscaria o PageLoader por um frame mesmo com tudo em
  // cache.
  const [initialCache] = useState(() => ({
    main: uid ? getPageCache<CachedMain>(uid, mainCacheKey(lang)) : null,
    releases: uid ? getPageCache<MajorReleaseMovie[]>(uid, releasesCacheKey(lang)) : null,
  }));
  // Estado compartilhado dos cards (filmes vistos, notas, séries seguidas,
  // disponibilidade em streaming, trailer e detalhe) — global, vive em
  // MediaCardsProvider (montado em PrivateLayout). Cada fileira pede a
  // disponibilidade dos PRÓPRIOS itens assim que eles chegam
  // (`media.loadAvailability`); "Principais lançamentos" já resolve isso
  // sozinha (`fetchRecentMajorReleases`, precisa da data de estreia de
  // qualquer forma) e passa `available` direto pro card.
  const media = useMediaCards();
  const mergeAvailability = media.loadAvailability;

  // "Últimos vistos" vive no MediaCardsProvider (sobrevive à troca de página;
  // só recarrega quando um filme é marcado/desmarcado).
  const recentlyWatched: DashboardMovie[] = media.recentlyWatched ?? [];

  const [heroTrailers, setHeroTrailers] = useState<HeroTrailer[]>(initialCache.main?.heroTrailers ?? []);
  // "Em cartaz" — lista de VERDADE do ingresso.com (quais filmes) pra
  // cidade atual do usuário, com cada título resolvido no TMDb
  // (fetchIngressoNowPlayingResolved, functions.ts) pra ter o mesmo
  // pôster/mesmo botão "já vi" das outras fileiras. Fallback pro
  // now_playing do TMDb (lista genérica, não real por cidade) se a busca
  // no ingresso.com falhar por qualquer motivo (geolocation negada, o
  // leitor de terceiro fora do ar, formato da página deles mudou etc.) —
  // MovieRowItem já normaliza os dois formatos.
  const [nowPlaying, setNowPlaying] = useState<MovieRowItem[] | null>(initialCache.main?.nowPlaying ?? null);
  const [nowPlayingError, setNowPlayingError] = useState<string | null>(null);
  const [boxOffice, setBoxOffice] = useState<DashboardMovie[] | null>(initialCache.main?.boxOffice ?? null);
  const [boxOfficeError, setBoxOfficeError] = useState<string | null>(null);

  // "Principais lançamentos dos últimos 12 meses" — pedido explícito da
  // Rebecca: "vamos colocar uma lista ali com os principais lançamentos
  // do ano no ocidente... e vamos colocar um simbolo de claquete para os
  // que já tiverem disponiveis para ver via streaming ou aluguel"
  // (período ajustado ao vivo pra janela rolante de 12 meses, ver
  // functions.ts). `available` de cada item já vem resolvido de lá.
  //
  // Busca UMA lista só (MAJOR_RELEASES_MODAL_LIMIT=120, bem maior que a
  // fileira) — a fileira da Home mostra só os 20 primeiros
  // (`majorReleases` abaixo, um `.slice`) e o modal "Ver tudo" usa a
  // lista inteira. ANTES eram duas buscas INDEPENDENTES (fileira buscava
  // seus 20, o modal buscava os 120 de novo do zero ao abrir) — cada
  // filme nessa lista custa 2 chamadas extras no TMDb (onde assistir +
  // data de estreia Brasil/EUA, ver fetchRecentMajorReleases), e a
  // fileira e o modal mostravam basicamente os MESMOS primeiros filmes
  // (mesmo /discover, mesma ordenação) — ou seja, metade do trabalho da
  // fileira era puro desperdício, refeito de novo pelo modal. Juntar num
  // fetch só elimina essa duplicata E deixa a lista do modal já cacheada
  // (service/PageCache.ts) e carregando junto com o resto da página —
  // pedido explícito da Rebecca: "o modal ver tudo... tem que ser
  // cacheado... e tem que loadar junto com o inicio da página".
  //
  // NÃO entra no `pageReady` geral (ver useEffect abaixo) — é de longe a
  // parte mais pesada da home (120 filmes x 2 chamadas = bem mais
  // requisições que o resto da página somado), travar o load geral nisso
  // reintroduziria exatamente a lentidão que a Rebecca reclamou. A
  // fileira mostra o próprio spinner pequeno (`loading` do MovieRow)
  // enquanto essa lista termina de resolver, igual o carrossel de
  // trailers já fazia.
  const [majorReleasesFull, setMajorReleasesFull] = useState<MajorReleaseMovie[] | null>(initialCache.releases);
  const [majorReleasesFullError, setMajorReleasesFullError] = useState<string | null>(null);

  // "Ver tudo" — pedido explícito da Rebecca: "coloca um botão ver tudo
  // ali, nos lançamentos dos ultimos 12 meses, os fillmes deve estar
  // agrupados por mes". Abre MajorReleasesModal.tsx, que agora só
  // RENDERIZA `majorReleasesFull` (passado por prop) — não busca mais
  // nada sozinho.
  const [majorReleasesModalOpen, setMajorReleasesModalOpen] = useState(false);
  // "ver todos" de "Últimos vistos" e de "Em cartaz" (PosterGridModal).
  const [recentModalOpen, setRecentModalOpen] = useState(false);
  const [nowPlayingModalOpen, setNowPlayingModalOpen] = useState(false);
  // "Em cartaz {cidade}" — geolocation do navegador + reverse geocoding
  // (service/LocationSettings.ts). Cai pro texto "Brazil" de sempre se o
  // usuário negar a permissão/geolocation não disponível.
  const [cityName, setCityName] = useState<string | null>(initialCache.main?.city ?? null);

  // Timelines seguidas (estrela no card, ver @/pages/private/timelines) —
  // aparecem aqui, abrem o mesmo TimelineDetail da página Timelines.
  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  // Load geral da página — pedido explícito da Rebecca: "tem muita coisa
  // carregando nessa pagina vamos fazer um load geral pra cada página".
  // Fica `false` até "Em cartaz" e "Campeões de bilheteria" resolverem —
  // sucesso ou erro, tanto faz, só não pode ficar em aberto pra sempre.
  // "Principais lançamentos" (`majorReleasesFull`) fica DE FORA desse
  // gate de propósito — é a parte mais pesada da home (ver comentário
  // longo em `majorReleasesFull` acima), travar o load geral nela é
  // exatamente a lentidão que a Rebecca reclamou ("o carregamento ta
  // demorando muito"). "Últimos vistos"/timelines seguidas (Firestore)
  // também ficam de fora: são rápidas e ligadas à conta, não precisam
  // travar o load geral.
  const [pageReady, setPageReady] = useState(initialCache.main !== null);

  useEffect(() => {
    const nowPlayingDone = nowPlaying !== null || nowPlayingError !== null;
    const boxOfficeDone = boxOffice !== null || boxOfficeError !== null;
    if (nowPlayingDone && boxOfficeDone) setPageReady(true);
  }, [nowPlaying, nowPlayingError, boxOffice, boxOfficeError]);

  useEffect(() => {
    if (!uid) return;
    // Categoria "filmes" só — pedido explícito da Rebecca: a mesma
    // fileira na página Séries mostra só as de categoria "series"
    // (@/pages/private/series/index.tsx), resolvendo de vez a
    // categorização que tinha ficado pendente.
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("filmes"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Os dados pesados da Home (em cartaz + trailers, bilheteria, principais
  // lançamentos/"Ver tudo") vêm prontos do backend (api/dashboard.ts), que
  // lê de um cache COMPARTILHADO no Firestore (7 dias) em vez de cada
  // navegador refazer dezenas/centenas de chamadas no TMDb sozinho — ver
  // comentário no topo de api/dashboard.ts. O client só resolve o que é
  // exclusivo do navegador: geolocation (cidade) e idioma do site.
  useEffect(() => {
    const callApi = async <T,>(part: "main" | "releases", city: string | null, forceRefresh: boolean): Promise<T> => {
      const params = new URLSearchParams({ lang, part });
      if (city) params.set("city", slugify(city));
      if (forceRefresh) params.set("refresh", "1");
      const response = await fetch(`/api/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error(`API respondeu ${response.status}`);
      return (await response.json()) as T;
    };

    // Parte rápida (em cartaz + trailers + bilheteria) — é ela que libera
    // o load geral (`pageReady`).
    const loadMain = async (city: string | null, forceRefresh: boolean) => {
      try {
        const data = await callApi<DashboardMainResponse>("main", city, forceRefresh);
        setHeroTrailers(data.heroTrailers);

        if (data.nowPlaying) {
          setNowPlaying(data.nowPlaying);
          setNowPlayingError(null);
          mergeAvailability(data.nowPlaying);
        } else {
          setNowPlayingError(t("dashboard.errors.nowPlaying"));
        }

        if (data.boxOffice) {
          setBoxOffice(data.boxOffice);
          setBoxOfficeError(null);
          mergeAvailability(data.boxOffice);
        } else {
          setBoxOfficeError(t("dashboard.errors.boxOffice"));
        }

        if (uid && data.nowPlaying && data.boxOffice) {
          setPageCache<CachedMain>(uid, mainCacheKey(lang), { city, nowPlaying: data.nowPlaying, heroTrailers: data.heroTrailers, boxOffice: data.boxOffice });
        }
      } catch (err) {
        console.error("Erro ao buscar dados da home (backend):", err);
        setNowPlayingError(t("dashboard.errors.nowPlaying"));
        setBoxOfficeError(t("dashboard.errors.boxOffice"));
      }
    };

    // Parte pesada (120 lançamentos do "Ver tudo", ver api/dashboard.ts) —
    // dispara junto com a outra mas NÃO trava a página.
    const loadReleases = async (forceRefresh: boolean) => {
      try {
        const data = await callApi<DashboardReleasesResponse>("releases", null, forceRefresh);
        if (data.majorReleasesFull) {
          setMajorReleasesFull(data.majorReleasesFull);
          if (uid) setPageCache(uid, releasesCacheKey(lang), data.majorReleasesFull);
        } else {
          setMajorReleasesFullError(t("dashboard.errors.majorReleases"));
        }
      } catch (err) {
        console.error("Erro ao buscar principais lançamentos (backend):", err);
        setMajorReleasesFullError(t("dashboard.errors.majorReleases"));
      }
    };

    const run = async () => {
      // "Atualizar" no UserMenu deixa um pedido (service/PageCache.ts) — vira `refresh=1`, que faz o backend ignorar o cache dele.
      const forceRefresh = consumeRefreshRequest("home");

      // Geolocation + Nominatim podem levar vários segundos (timeout de
      // 8s, ver LocationSettings.ts) — esperar isso TODA visita antes de
      // chamar o backend era uma das causas do carregamento lento. Com a
      // última cidade lembrada, a chamada sai na hora; a localização de
      // verdade resolve em paralelo e só refaz "em cartaz" se mudou.
      const cityPromise = fetchCurrentCityName().catch(() => null);
      const rememberedCity = readRememberedCity();
      const startCity = rememberedCity ?? (await cityPromise);

      // Cópia local ainda válida (e da mesma cidade): a página já nasceu
      // preenchida (`initialCache`), não precisa chamar o backend de novo.
      const mainFromCache = !forceRefresh && initialCache.main !== null && initialCache.main.city === startCity;
      const releasesFromCache = !forceRefresh && initialCache.releases !== null;

      setCityName(startCity);
      if (mainFromCache && initialCache.main) mergeAvailability([...initialCache.main.nowPlaying, ...initialCache.main.boxOffice]);
      if (!releasesFromCache) loadReleases(forceRefresh);
      if (!mainFromCache) await loadMain(startCity, forceRefresh);

      const realCity = await cityPromise;
      if (realCity) rememberCity(realCity);
      if (realCity && realCity !== startCity) {
        setCityName(realCity);
        await loadMain(realCity, false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pageReady) {
    return <PageLoader />;
  }

  return (
    <div className="dashboard">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel uid={uid} />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={media.checkedMap} onSelect={setSelectedTimeline} />

      <HomeGroup>
      <RecentlyWatchedSection movies={recentlyWatched} onSeeAll={() => setRecentModalOpen(true)} />

      <RankSection
        popularityTitle={
          <>
            {t("dashboard.rank.popularityLabel")} <strong>{new Date().getFullYear()}</strong>
          </>
        }
        popularity={boxOffice}
        popularityError={boxOfficeError}
        recentlyWatched={recentlyWatched}
      />

      <NowPlayingSection
        title={cityName ? t("dashboard.rows.nowPlayingCity", { city: cityName }) : t("dashboard.rows.nowPlayingBrazil")}
        items={nowPlaying}
        error={nowPlayingError}
        onSeeAll={() => setNowPlayingModalOpen(true)}
      />

      <ReleasesSection movies={majorReleasesFull} error={majorReleasesFullError} onSeeAll={() => setMajorReleasesModalOpen(true)} />
      </HomeGroup>

      {recentModalOpen && <RecentlyWatchedModal onClose={() => setRecentModalOpen(false)} />}

      {nowPlayingModalOpen && (
        <PosterGridModal
          title={cityName ? t("dashboard.rows.nowPlayingCity", { city: cityName }) : t("dashboard.rows.nowPlayingBrazil")}
          items={nowPlaying}
          error={nowPlayingError}
          onOpenItem={openOnIngresso}
          onClose={() => setNowPlayingModalOpen(false)}
        />
      )}

      {majorReleasesModalOpen && (
        <MajorReleasesModal movies={majorReleasesFull} error={majorReleasesFullError} onClose={() => setMajorReleasesModalOpen(false)} />
      )}

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
};

export default Dashboard;
