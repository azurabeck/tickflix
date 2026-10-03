// src/pages/private/anime/index.tsx
// Página "Animes" (rota /animes) — pedido explícito da Rebecca: "vamos
// fazer uma página exatamente igual, mesma lógica e layout... para
// animes". É a página Séries (@/pages/private/series) com a condição de
// anime INVERTIDA: lá exclui anime das fileiras de descoberta (isAnime,
// series/functions.ts), aqui só ENTRA quem é anime (mesma definição:
// gênero Animação + produzido no Japão).
//
// Mesmo layout da Séries (Figma da Rebecca) e o MESMO card global
// (@/components/mediaCard, tipo `serie` — usado em séries E animes):
// "Meus animes" (os que o usuário segue, com a barra de episódios), o bloco
// de ranks ("Mais vistos em {ano}" | "Seu Rank de Notas" | "Sugestão da IA",
// só de animes) e uma fileira "Melhor avaliados na {streaming}" por
// provedor. Todo o estado e as ações (seguir, nota, trailer, episódios,
// detalhe) vêm do MediaCardsProvider; o que muda daqui pra Séries é
// `category: "animes"` (em qual lista o check segue o título) e
// `anime/functions.ts` no backend (descoberta com a condição invertida).
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import PageLoader from "@/components/pageLoader";
import { useMediaCards } from "@/components/mediaCard";
import { fetchTimelines, movieKey, type Timeline } from "@/service/TimelineSettings";
import CreateTimelinePanel from "@/pages/private/home/dashboard/CreateTimelinePanel";
import FollowedTimelinesRow from "@/pages/private/home/dashboard/FollowedTimelinesRow";
import HeroCarousel from "@/pages/private/home/dashboard/HeroCarousel";
import { HomeGroup } from "@/pages/private/home/dashboard/HomeGroup";
import RankSection from "@/pages/private/home/dashboard/RankSection";
import type { DashboardMovie } from "@/pages/private/home/dashboard/functions";
import { useResolvedTitles } from "@/pages/private/home/dashboard/useResolvedTitles";
import TimelineDetail from "@/pages/private/timelines/TimelineDetail";
import { STREAMING_PROVIDERS } from "@/pages/private/series/functions";
import SeriesRailSection, { toSeriesCardItem } from "@/pages/private/series/SeriesRailSection";
import { useDiscovery } from "@/pages/private/series/useDiscovery";
import "@/pages/private/series/styles.scss";

const AnimePage = () => {
  const { t } = useTranslation();
  const uid = auth.currentUser?.uid ?? null;
  const media = useMediaCards();

  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  // Descoberta (fileiras por streaming, top do ano, trailers) vinda do
  // backend + cópia local de 7 dias — ver series/useDiscovery.ts.
  const { providerRows, providerErrors, topOfYear, topOfYearError, heroTrailers, pageReady } = useDiscovery("anime", uid, () => undefined);

  useEffect(() => {
    if (!uid) return;
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("animes"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
  }, [uid]);

  // Só categoria "animes" — a mesma collection `users/{uid}/following`
  // também guarda série seguida pela página Séries.
  const followedAnime = media.followedList.filter((s) => s.category === "animes");

  // Backdrop dos animes seguidos (o doc seguido só guarda o pôster).
  const { titles: followedTitles } = useResolvedTitles(followedAnime.map((s) => movieKey("tv", s.id)));
  // Série e anime são ambos `tv` no TMDb e a nota não guarda a categoria, então
  // o "Seu Rank" e a IA desta página só olham os animes que ela CONHECE: os
  // que o usuário segue e os das listas de descoberta (todas de anime).
  const animeKeys = new Set<string>(followedAnime.map((a) => movieKey("tv", a.id)));
  for (const item of topOfYear ?? []) animeKeys.add(movieKey("tv", item.id));
  for (const rows of Object.values(providerRows)) for (const item of rows ?? []) animeKeys.add(movieKey("tv", item.id));

  // Base "assistidos" da IA quando não há nota: os animes que o usuário segue.
  const followedAsRecent: DashboardMovie[] = followedAnime.map((anime) => ({
    id: anime.id,
    mediaType: "tv",
    title: anime.title,
    posterPath: anime.posterPath,
  }));

  const myAnimeItems = followedAnime.map((anime) =>
    toSeriesCardItem({ ...anime, backdropPath: followedTitles.get(movieKey("tv", anime.id))?.backdropPath ?? null }, "animes")
  );

  if (!pageReady) {
    return <PageLoader />;
  }

  return (
    <div className="series-page series-page--blocks">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel uid={uid} categoryLock="animes" placeholder={t("dashboard.createTimeline.placeholderAnimes")} />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={media.checkedMap} onSelect={setSelectedTimeline} />

      <HomeGroup>
        <SeriesRailSection title={t("animePage.myAnime")} items={myAnimeItems} emptyMessage={t("animePage.emptyMine")} />

        <RankSection
          mediaKind="tv"
          category="animes"
          keyFilter={(key) => animeKeys.has(key)}
          popularityTitle={
            <>
              {t("animePage.mostWatched")} <strong>{new Date().getFullYear()}</strong>
            </>
          }
          popularity={topOfYear ? topOfYear.map((item) => ({ id: item.id, mediaType: "tv" as const, title: item.title })) : null}
          popularityError={topOfYearError}
          recentlyWatched={followedAsRecent}
        />

        {STREAMING_PROVIDERS.map((provider) => (
          <SeriesRailSection
            key={provider.id}
            title={t("animePage.bestRatedOn", { provider: provider.label })}
            items={providerRows[provider.id]?.map((item) => toSeriesCardItem(item, "animes")) ?? null}
            loading={!providerRows[provider.id] && !providerErrors[provider.id]}
            error={providerErrors[provider.id] ?? null}
          />
        ))}
      </HomeGroup>

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
};

export default AnimePage;
