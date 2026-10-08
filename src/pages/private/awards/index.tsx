import AddDataModal from "@/components/organisms/AddDataModal";
import EditionDetail from "@/components/organisms/EditionDetail";
import EditionGrid from "@/components/organisms/EditionGrid";
import MovieDetail from "@/components/organisms/MovieDetail";
import Modal from "@/components/atoms/Modal";
import PageShell from "@/components/atoms/PageShell";
import { useAwardsDashboard } from "@/actions/awards/dashboard";
import type { AwardConfig } from "@/actions/awards/editions";

interface AwardPageProps {
  config: AwardConfig;
}

// Página de uma premiação: grade de edições -> detalhe da edição (indicados + progresso).
const AwardPage = ({ config }: AwardPageProps) => {
  const page = useAwardsDashboard(config);
  const { selectedEdition, selectedNominee } = page;
  const shellStyle = { "--awards-accent": config.accentColor } as React.CSSProperties;

  return (
    <PageShell
      variant="dark"
      style={shellStyle}
      title={selectedEdition ? undefined : config.name}
      subtitle={selectedEdition ? undefined : "Todas as edições, do vencedor ao último indicado."}
    >
      {selectedEdition ? (
        <EditionDetail
          config={config}
          edition={selectedEdition}
          uid={page.uid}
          onBack={() => page.setSelectedOrdinal(null)}
          onSelectNominee={page.setSelectedNominee}
          onOpenAddData={() => page.setAddDataOpen(true)}
        />
      ) : (
        <EditionGrid editions={page.editions} onSelect={(edition) => page.setSelectedOrdinal(edition.ordinal)} />
      )}

      {selectedNominee && selectedNominee.tmdbId !== null && (
        <MovieDetail id={selectedNominee.tmdbId} mediaType={selectedNominee.mediaType} onClose={() => page.setSelectedNominee(null)} />
      )}

      {selectedNominee && selectedNominee.tmdbId === null && (
        <Modal onClose={() => page.setSelectedNominee(null)} size="sm">
          <p>
            <strong>{selectedNominee.filmTitle}</strong> não tem um tmdbId cadastrado — edite os dados dessa edição pra adicionar (é o que permite buscar os detalhes reais no TMDb).
          </p>
        </Modal>
      )}

      {page.addDataOpen && selectedEdition && (
        <AddDataModal config={config} edition={selectedEdition} onClose={() => page.setAddDataOpen(false)} onSaved={page.saveEditionData} />
      )}
    </PageShell>
  );
};

export default AwardPage;
