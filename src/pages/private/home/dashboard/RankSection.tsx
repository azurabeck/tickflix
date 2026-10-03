// src/pages/private/home/dashboard/RankSection.tsx
// Bloco de ranks (Figma da Rebecca): a LISTA POPULAR (na Home, "Rank
// Popularidade {ano}" — campeões de bilheteria; na página Séries, "Mais
// vistas em {ano}"), "Seu Rank de Notas" (os títulos que o próprio usuário
// mais bem avaliou) e, na coluna roxa à direita, "Sugestão da IA"
// (AiSuggestionsPanel.tsx). Os dois ranks são o mesmo componente padrão
// (@/components/rankComponent). `mediaKind` escolhe de que tipo de título
// o "Seu Rank" e a IA tratam: filmes na Home, séries na página Séries.
import { useEffect, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { movieKey } from "@/service/TimelineSettings";
import RankComponent, { type RankItem } from "@/components/rankComponent";
import { cardTypeOf, useMediaCards } from "@/components/mediaCard";
import AiSuggestionsPanel from "./AiSuggestionsPanel";
import HomeSection from "./HomeSection";
import { HomeRow } from "./HomeGroup";
import { useResolvedTitles } from "./useResolvedTitles";
import type { DashboardMovie } from "./functions";
import type { SuggestionKind } from "./suggestions";

// Tamanho máximo de cada rank (o componente mostra 10 e alterna pra 20).
const RANK_MAX = 20;

interface PopularEntry {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
}

interface RankSectionProps {
  mediaKind?: SuggestionKind;
  // Série e anime são os dois `tv` no TMDb: `category` diz em qual lista o
  // check segue o título, e `keyFilter` deixa o "Seu Rank" e a IA só com os
  // títulos DA PÁGINA (ex.: Animes só com os animes que ela conhece).
  category?: "series" | "animes";
  keyFilter?: (key: string) => boolean;
  // Título do rank popular (ex.: "Rank Popularidade <strong>2026</strong>").
  popularityTitle: ReactNode;
  popularity: PopularEntry[] | null;
  popularityError: string | null;
  // Títulos vistos recentemente — base da IA quando não há nenhuma nota.
  recentlyWatched: DashboardMovie[];
}

const RankSection = ({ mediaKind = "movie", category, keyFilter, popularityTitle, popularity, popularityError, recentlyWatched }: RankSectionProps) => {
  const { t } = useTranslation();
  const media = useMediaCards();
  const prefix = `${mediaKind}-`;

  const toItem = (key: string, id: number, mediaType: "movie" | "tv", title: string): RankItem => ({
    key,
    id,
    mediaType,
    type: cardTypeOf({ mediaType }),
    title,
    rating: media.ratings.get(key) ?? null,
    checked: media.isChecked({ id, mediaType }),
    available: media.availabilityMap.has(key),
  });

  useEffect(() => {
    media.loadAvailability((popularity ?? []).slice(0, RANK_MAX));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popularity]);

  const popularityItems = (popularity ?? []).slice(0, RANK_MAX).map((entry) => toItem(movieKey(entry.mediaType, entry.id), entry.id, entry.mediaType, entry.title));

  // Só títulos do tipo da página (filme ou série); melhor nota primeiro,
  // empate fica com o que foi visto por último.
  const ratedKeys = useMemo(
    () =>
      [...media.ratings.entries()]
        .filter(([key]) => key.startsWith(prefix) && (!keyFilter || keyFilter(key)))
        .sort(([keyA, a], [keyB, b]) => b - a || (media.checkedMap.get(keyB) ?? 0) - (media.checkedMap.get(keyA) ?? 0))
        .slice(0, RANK_MAX)
        .map(([key]) => key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [media.ratings, media.checkedMap, prefix, keyFilter]
  );
  const { titles } = useResolvedTitles(ratedKeys);

  const yourItems = ratedKeys.flatMap((key): RankItem[] => {
    const title = titles.get(key);
    const [mediaType, idText] = key.split("-");
    if (!title || (mediaType !== "movie" && mediaType !== "tv")) return [];
    return [toItem(key, Number(idText), mediaType, title.title)];
  });

  const handlers = {
    disabled: !media.uid,
    onOpen: (item: RankItem) => media.openDetail({ id: item.id, mediaType: item.mediaType }),
    onToggleChecked: (item: RankItem) => media.toggleChecked({ id: item.id, mediaType: item.mediaType, title: item.title, category }),
    onRate: (item: RankItem, rating: number | null) => media.rate(item.key, rating),
  };

  // Três SEÇÕES lado a lado: cada rank é a sua, e a sugestão da IA é a
  // terceira (um painel roxo, mais largo). No desenho da Rebecca só há
  // espaço ENTRE os dois ranks; o painel roxo fica colado no segundo
  // (`home-section--gap-after`, home.scss).
  return (
    <HomeRow columns="1fr 1fr 2fr">
      <HomeSection className="home-section--gap-after">
        <RankComponent title={popularityTitle} items={popularityItems} loading={popularity === null && !popularityError} error={popularityError} {...handlers} />
      </HomeSection>
      <HomeSection>
        <RankComponent
          title={
            <>
              {t("dashboard.rank.yoursLabel")} <strong>{t("dashboard.rank.yoursStrong")}</strong>
            </>
          }
          items={yourItems}
          emptyMessage={t(category === "animes" ? "dashboard.rank.yoursEmptyAnime" : mediaKind === "tv" ? "dashboard.rank.yoursEmptyTv" : "dashboard.rank.yoursEmpty")}
          {...handlers}
        />
      </HomeSection>
      <AiSuggestionsPanel recentlyWatched={recentlyWatched} mediaKind={mediaKind} category={category} keyFilter={keyFilter} />
    </HomeRow>
  );
};

export default RankSection;
