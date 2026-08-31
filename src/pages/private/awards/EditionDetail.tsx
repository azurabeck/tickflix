// src/pages/private/awards/EditionDetail.tsx
// Categorias + indicados de UMA edição — vencedor sempre primeiro (já
// vem ordenado assim do dado, ver functions.ts), o resto na sequência.
// Generalização de pages/private/oscar/EditionDetail.tsx — recebe
// `config` só pro texto do cabeçalho ("cerimônia do Oscar" vs "edição do
// Festival de Cannes", ver AwardConfig.editionNoun).
import { ArrowLeft, Clapperboard, FileJson, Trophy } from "lucide-react";
import WatchButton from "@/components/watchButton";
import { posterUrl } from "@/service/TMDbSettings";
import type { AwardConfig } from "./awardConfigs";
import { awardNomineeKey, type AwardEdition, type AwardNominee } from "./functions";

interface EditionDetailProps {
  config: AwardConfig;
  edition: AwardEdition;
  watchedMap: Map<string, number>;
  uid: string | null;
  onBack: () => void;
  onSelectNominee: (categoryName: string, nominee: AwardNominee) => void;
  onToggleWatched: (nominee: AwardNominee) => void;
  onOpenAddData: () => void;
}

const NomineeCard = ({
  nominee,
  categoryName,
  isWatched,
  uid,
  onSelectNominee,
  onToggleWatched,
}: {
  nominee: AwardNominee;
  categoryName: string;
  isWatched: boolean;
  uid: string | null;
  onSelectNominee: (categoryName: string, nominee: AwardNominee) => void;
  onToggleWatched: (nominee: AwardNominee) => void;
}) => {
  const poster = posterUrl(nominee.posterPath);

  return (
    <div className={nominee.isWinner ? "awards__nominee awards__nominee--winner" : "awards__nominee"}>
      <button type="button" className="awards__nominee-open" onClick={() => onSelectNominee(categoryName, nominee)}>
        {poster ? (
          <img src={poster} alt={nominee.filmTitle} className="awards__nominee-poster" />
        ) : (
          <div className="awards__nominee-poster awards__nominee-poster--empty">
            <Clapperboard size={22} />
          </div>
        )}

        {nominee.isWinner && (
          <span className="awards__nominee-winner-badge">
            <Trophy size={12} />
            Vencedor
          </span>
        )}

        <span className="awards__nominee-title">{nominee.filmTitle}</span>
        {nominee.personName && <span className="awards__nominee-person">{nominee.personName}</span>}
      </button>

      <WatchButton isWatched={isWatched} onToggle={() => onToggleWatched(nominee)} disabled={!uid} />
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

const EditionDetail = ({
  config,
  edition,
  watchedMap,
  uid,
  onBack,
  onSelectNominee,
  onToggleWatched,
  onOpenAddData,
}: EditionDetailProps) => {
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
        <div className="awards__nominee-row">
          {category.nominees.map((nom) => (
            <NomineeCard
              key={`${nom.filmTitle}-${nom.personName ?? ""}`}
              nominee={nom}
              categoryName={category.name}
              isWatched={watchedMap.has(awardNomineeKey(nom))}
              uid={uid}
              onSelectNominee={onSelectNominee}
              onToggleWatched={onToggleWatched}
            />
          ))}
        </div>
      </section>
    ))}
  </div>
  );
};

export default EditionDetail;
