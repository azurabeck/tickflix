import { ArrowLeft, FileJson, Trophy } from "lucide-react";
import AwardButton from "@/components/atoms/AwardButton";
import MediaGrid from "@/components/atoms/MediaGrid";
import MediaCard from "@/components/molecules/MediaCard";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import { awardNomineeKey, type AwardCategory, type AwardConfig, type AwardEdition, type AwardNominee } from "@/actions/awards/editions";
import { useMediaCards } from "@/contexts/MediaCards";
import type { MediaItem } from "@/types/media";
import "./style.scss";

interface EditionDetailProps {
  config: AwardConfig;
  edition: AwardEdition;
  uid: string | null;
  onBack: () => void;
  onSelectNominee: (nominee: AwardNominee) => void;
  onOpenAddData: () => void;
}

const CategoryNominees = ({ category, onSelectNominee }: { category: AwardCategory; onSelectNominee: (nominee: AwardNominee) => void }) => {
  const items: MediaItem[] = category.nominees.map((nom) => ({
    id: nom.tmdbId ?? undefined,
    mediaType: nom.tmdbId !== null ? nom.mediaType : undefined,
    title: nom.filmTitle,
    posterPath: nom.posterPath,
  }));
  const open = useOpenCard(items);

  return (
    <MediaGrid>
      {category.nominees.map((nom, index) => {
        const id = cardKey(items[index], index);
        return (
          <MediaCard
            key={`${nom.filmTitle}-${nom.personName ?? ""}`}
            item={items[index]}
            isOpen={open.openKey === id}
            onSelect={() => open.setOpenKey(id)}
            onOpen={() => onSelectNominee(nom)}
            badge={
              nom.isWinner ? (
                <>
                  <Trophy size={12} />
                  Vencedor
                </>
              ) : undefined
            }
            subtitle={nom.personName}
          />
        );
      })}
    </MediaGrid>
  );
};

const countEditionFilms = (edition: AwardEdition, watchedMap: Map<string, number>) => {
  const uniqueKeys = new Set<string>();
  for (const category of edition.categories ?? []) {
    for (const nom of category.nominees) uniqueKeys.add(awardNomineeKey(nom));
  }
  const total = uniqueKeys.size;
  const watched = Array.from(uniqueKeys).filter((key) => watchedMap.has(key)).length;
  return { categoriesCount: edition.categories?.length ?? 0, total, watched };
};

// Uma edição: progresso de filmes vistos + indicados por categoria.
const EditionDetail = ({ config, edition, uid, onBack, onSelectNominee, onOpenAddData }: EditionDetailProps) => {
  const { checkedMap } = useMediaCards();
  const { categoriesCount, total, watched } = countEditionFilms(edition, checkedMap);
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);

  return (
    <div className="edition-detail">
      <button type="button" className="edition-detail__back" onClick={onBack}>
        <ArrowLeft size={16} />
        Todas as edições
      </button>

      <div className="edition-detail__header">
        <div>
          <h1 className="edition-detail__title">
            {edition.ordinal}ª {config.editionNoun} <span>· {edition.ceremonyYear}</span>
          </h1>
          <div className="edition-detail__meta">
            <span className="edition-detail__subtitle">Filmes elegíveis de {edition.filmYear}</span>
            {edition.categories && (
              <>
                <span className="edition-detail__subtitle">
                  {categoriesCount} categorias - {total} filmes
                </span>
                <div className="edition-detail__progress">
                  <div className="edition-detail__progress-bar">
                    <div className="edition-detail__progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="edition-detail__subtitle">
                    {watched}/{total} filmes vistos
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <AwardButton onClick={onOpenAddData} disabled={!uid}>
          <FileJson size={15} />
          {edition.categories ? "Editar dados" : "Adicionar dados"}
        </AwardButton>
      </div>

      {!edition.categories && <p className="edition-detail__empty">Os indicados dessa edição ainda não foram cadastrados — clique em "Adicionar dados".</p>}

      {edition.categories?.map((category) => (
        <section key={category.name} className="edition-detail__category">
          <h2 className="edition-detail__category-title">{category.name}</h2>
          <CategoryNominees category={category} onSelectNominee={onSelectNominee} />
        </section>
      ))}
    </div>
  );
};

export default EditionDetail;
