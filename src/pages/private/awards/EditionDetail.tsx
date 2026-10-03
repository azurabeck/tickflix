// src/pages/private/awards/EditionDetail.tsx
// Categorias + indicados de UMA edição — vencedor sempre primeiro (já
// vem ordenado assim do dado, ver functions.ts), o resto na sequência.
// Generalização de pages/private/oscar/EditionDetail.tsx — recebe
// `config` só pro texto do cabeçalho ("cerimônia do Oscar" vs "edição do
// Festival de Cannes", ver AwardConfig.editionNoun).
//
// Cada indicado é o CARD GLOBAL (@/components/mediaCard): filme = card
// `movie`, série = card `serie`; vencedor ganha o selo "Vencedor" na
// imagem e, em categoria de pessoa, o nome dela sob o título. Indicado sem
// tmdbId cadastrado vira card sem ações (não dá pra marcar/avaliar algo que
// não existe no TMDb).
import { ArrowLeft, FileJson, Trophy } from "lucide-react";
import { ConnectedMediaCard, cardKey, useMediaCards, useOpenCard, type MediaItem } from "@/components/mediaCard";
import type { AwardConfig } from "./awardConfigs";
import { awardNomineeKey, type AwardCategory, type AwardEdition, type AwardNominee } from "./functions";

interface EditionDetailProps {
  config: AwardConfig;
  edition: AwardEdition;
  uid: string | null;
  onBack: () => void;
  // Clique na imagem do card aberto (detalhe do indicado).
  onSelectNominee: (categoryName: string, nominee: AwardNominee) => void;
  onOpenAddData: () => void;
}

// Indicados de UMA categoria — "um card aberto por vez" por categoria.
const CategoryNominees = ({
  category,
  onSelectNominee,
}: {
  category: AwardCategory;
  onSelectNominee: (categoryName: string, nominee: AwardNominee) => void;
}) => {
  const items: MediaItem[] = category.nominees.map((nom) => ({
    id: nom.tmdbId ?? undefined,
    mediaType: nom.tmdbId !== null ? nom.mediaType : undefined,
    title: nom.filmTitle,
    posterPath: nom.posterPath,
  }));
  const open = useOpenCard(items);

  return (
    <div className="media-grid">
      {category.nominees.map((nom, index) => {
        const id = cardKey(items[index], index);
        return (
          <ConnectedMediaCard
            key={`${nom.filmTitle}-${nom.personName ?? ""}`}
            item={items[index]}
            isOpen={open.openKey === id}
            onSelect={() => open.setOpenKey(id)}
            onOpen={() => onSelectNominee(category.name, nom)}
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
    </div>
  );
};

// Filmes ÚNICOS da edição (um indicado em 2+ categorias conta uma vez
// só) — base pra "X categorias - Y filmes" e pra barra "visto: N/Y".
const countEditionFilms = (edition: AwardEdition, watchedMap: Map<string, number>) => {
  const uniqueKeys = new Set<string>();
  for (const category of edition.categories ?? []) {
    for (const nom of category.nominees) uniqueKeys.add(awardNomineeKey(nom));
  }
  const total = uniqueKeys.size;
  const watched = Array.from(uniqueKeys).filter((key) => watchedMap.has(key)).length;
  return { categoriesCount: edition.categories?.length ?? 0, total, watched };
};

const EditionDetail = ({ config, edition, uid, onBack, onSelectNominee, onOpenAddData }: EditionDetailProps) => {
  const { checkedMap: watchedMap } = useMediaCards();
  const { categoriesCount, total, watched } = countEditionFilms(edition, watchedMap);
  const pct = total === 0 ? 0 : Math.round((watched / total) * 100);

  return (
  <div className="awards__edition-detail">
    <button type="button" className="awards__back" onClick={onBack}>
      <ArrowLeft size={16} />
      Todas as edições
    </button>

    <div className="awards__edition-detail-header">
      <div>
        <h1 className="awards__edition-detail-title">
          {edition.ordinal}ª {config.editionNoun} <span>· {edition.ceremonyYear}</span>
        </h1>
        <div className="awards__edition-detail-meta">
          <span className="awards__edition-detail-subtitle">Filmes elegíveis de {edition.filmYear}</span>
          {edition.categories && (
            <>
              <span className="awards__edition-detail-subtitle">
                {categoriesCount} categorias - {total} filmes
              </span>
              <div className="awards__edition-detail-progress">
                <div className="awards__edition-detail-progress-bar">
                  <div className="awards__edition-detail-progress-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="awards__edition-detail-subtitle">
                  {watched}/{total} filmes vistos
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <button type="button" className="awards__resolve-button" onClick={onOpenAddData} disabled={!uid}>
        <FileJson size={15} />
        {edition.categories ? "Editar dados" : "Adicionar dados"}
      </button>
    </div>

    {!edition.categories && (
      <p className="awards__empty">Os indicados dessa edição ainda não foram cadastrados — clique em "Adicionar dados".</p>
    )}

    {edition.categories?.map((category) => (
      <section key={category.name} className="awards__category">
        <h2 className="awards__category-title">{category.name}</h2>
        <CategoryNominees category={category} onSelectNominee={onSelectNominee} />
      </section>
    ))}
  </div>
  );
};

export default EditionDetail;
