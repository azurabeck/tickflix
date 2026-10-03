// src/pages/private/series/index.tsx
// Página "Séries" (rota /series) — pedido explícito da Rebecca: "vamos
// fazer a aba de séries... primeiro a visualização das séries mais
// vistas de cada streaming... uma barra de procurar, quando eu adicionar
// uma série eu posso marcar quais episódios eu já assisti daquela
// série." Depois ganhou a MESMA estrutura inicial da Home (Hero + painel
// "criar timeline" + timelines seguidas, peças REUSADAS de
// @/pages/private/home/dashboard) e, por último, o MESMO layout de blocos da
// Home (Figma da Rebecca), em um grupo de seções:
//
//   Minhas séries            — fileira de cards (um aberto por vez) com a
//                              barra de episódios vistos (10 / 300)
//   [ Rank | Seu Rank | IA ] — o "Top 20 mais vistas no ano" virou o rank
//                              (RankComponent), mais "Seu Rank de Notas" e a
//                              "Sugestão da IA", só de séries
//   Melhor avaliadas na {streaming} × 6 — fileiras iguais a "Minhas séries"
//
// Os cards são o CARD GLOBAL (@/components/mediaCard, tipo `serie`): o check
// é "estou assistindo" (segue a série → ela entra em "Minhas séries"), a
// nota vale a qualquer momento. Todo o estado e as ações (seguir, nota,
// trailer, episódios, detalhe) vêm do MediaCardsProvider — esta página só
// monta as fileiras e a descoberta do TMDb.
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import PageLoader from "@/components/pageLoader";
import { useMediaCards } from "@/components/mediaCard";
import { fetchTimelines, movieKey, type Timeline } from "@/service/TimelineSettings";
import CreateTimelinePanel from "@/pages/private/home/dashboard/CreateTimelinePanel";
import FollowedTimelinesRow from "@/pages/private/home/dashboard/FollowedTimelinesRow";
import HeroCarousel from "@/pages/private/home/dashboard/HeroCarousel";
import RankSection from "@/pages/private/home/dashboard/RankSection";
import { HomeGroup } from "@/pages/private/home/dashboard/HomeGroup";
import type { DashboardMovie } from "@/pages/private/home/dashboard/functions";
import { useResolvedTitles } from "@/pages/private/home/dashboard/useResolvedTitles";
import TimelineDetail from "@/pages/private/timelines/TimelineDetail";
import { STREAMING_PROVIDERS } from "./functions";
import { useDiscovery } from "./useDiscovery";
import SeriesRailSection, { toSeriesCardItem } from "./SeriesRailSection";
import "./styles.scss";

const SeriesPage = () => {
  const { t } = useTranslation();
  const uid = auth.currentUser?.uid ?? null;
  const media = useMediaCards();

  const [followedTimelines, setFollowedTimelines] = useState<Timeline[]>([]);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);

  // Descoberta (fileiras por streaming, top do ano, trailers) vinda do
  // backend + cópia local de 7 dias — ver ./useDiscovery.ts. Cada lote
  // pede a disponibilidade dos próprios itens (ícone de streaming das
  // linhas do rank).
  const { providerRows, providerErrors, topOfYear, topOfYearError, heroTrailers, pageReady } = useDiscovery("series", uid, (items) =>
    media.loadAvailability(items.map((item) => ({ id: item.id, mediaType: "tv" as const })))
  );

  useEffect(() => {
    if (!uid) return;
    fetchTimelines(uid)
      .then((all) => setFollowedTimelines(all.filter((t) => t.followed && t.types.includes("series"))))
      .catch((err) => console.error("Erro ao buscar timelines seguidas:", err));
  }, [uid]);

  // Só categoria "series" — a mesma collection também guarda anime seguido
  // pela página Animes (service/FollowingSettings.ts, `FollowedCategory`);
  // cada página filtra a própria.
  const followedSeries = media.followedList.filter((s) => s.category === "series");

  // Backdrop das séries seguidas (o doc seguido só guarda o pôster) —
  // resolvido no TMDb; `fetchTitleById` tem memo, não refaz a cada render.
  const { titles: followedTitles } = useResolvedTitles(followedSeries.map((s) => movieKey("tv", s.id)));

  // Os animes que o usuário segue também são `tv` — ficam fora do "Seu Rank"
  // e da IA de séries.
  const followedAnimeKeys = new Set(media.followedList.filter((s) => s.category === "animes").map((s) => movieKey("tv", s.id)));

  const mySeriesItems = followedSeries.map((series) =>
    toSeriesCardItem({ ...series, backdropPath: followedTitles.get(movieKey("tv", series.id))?.backdropPath ?? null }, "series")
  );

  // Base "assistidos" da IA quando não há nota: as séries que o usuário segue.
  const followedAsRecent: DashboardMovie[] = followedSeries.map((series) => ({
    id: series.id,
    mediaType: "tv",
    title: series.title,
    posterPath: series.posterPath,
  }));

  if (!pageReady) {
    return <PageLoader />;
  }

  return (
    <div className="series-page series-page--blocks">
      <HeroCarousel items={heroTrailers} />

      <CreateTimelinePanel uid={uid} categoryLock="series" placeholder={t("dashboard.createTimeline.placeholderSeries")} />

      <FollowedTimelinesRow timelines={followedTimelines} watchedMap={media.checkedMap} onSelect={setSelectedTimeline} />

      <HomeGroup>
        <SeriesRailSection title={t("seriesPage.mySeries")} items={mySeriesItems} emptyMessage={t("seriesPage.emptyMine")} />

        <RankSection
          mediaKind="tv"
          category="series"
          keyFilter={(key) => !followedAnimeKeys.has(key)}
          popularityTitle={
            <>
              {t("seriesPage.mostWatched")} <strong>{new Date().getFullYear()}</strong>
            </>
          }
          popularity={topOfYear ? topOfYear.map((item) => ({ id: item.id, mediaType: "tv" as const, title: item.title })) : null}
          popularityError={topOfYearError}
          recentlyWatched={followedAsRecent}
        />

        {STREAMING_PROVIDERS.map((provider) => (
          <SeriesRailSection
            key={provider.id}
            title={t("seriesPage.bestRatedOn", { provider: provider.label })}
            items={providerRows[provider.id]?.map((item) => toSeriesCardItem(item, "series")) ?? null}
            loading={!providerRows[provider.id] && !providerErrors[provider.id]}
            error={providerErrors[provider.id] ?? null}
          />
        ))}
      </HomeGroup>

      {selectedTimeline && <TimelineDetail timeline={selectedTimeline} onClose={() => setSelectedTimeline(null)} />}
    </div>
  );
};

export default SeriesPage;
