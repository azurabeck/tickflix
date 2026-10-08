import { Navigate, useParams } from "react-router-dom";
import MediaGrid from "@/components/atoms/MediaGrid";
import PageShell from "@/components/atoms/PageShell";
import StatusMessage from "@/components/atoms/StatusMessage";
import MediaCard from "@/components/molecules/MediaCard";
import { findFranchiseConfig } from "@/actions/franchises/catalog";
import { useFranchisesDashboard } from "@/actions/franchises/dashboard";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import { ROUTES } from "@/routes";
import "./style.scss";

// Página de uma franquia (Marvel, Star Wars...): todos os filmes e séries, marque o que já viu.
const FranchisePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const config = findFranchiseConfig(slug);
  const { hasTimeline, loading, error, items, watchedCount } = useFranchisesDashboard(config);
  const open = useOpenCard(items);

  if (!config) return <Navigate to={ROUTES.HOME} replace />;

  return (
    <PageShell variant="dark" width="narrow" title={config.name} subtitle="Todos os filmes e séries — marque o que você já viu.">
      {loading && (
        <StatusMessage variant="loading" spinner>
          {hasTimeline ? "Carregando..." : "Montando a lista completa dessa franquia (pode levar alguns segundos)..."}
        </StatusMessage>
      )}

      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      {!loading && !error && items.length > 0 && (
        <p className="franchise-page__progress">
          visto: {watchedCount}/{items.length}
        </p>
      )}

      {!loading && !error && (
        <MediaGrid>
          {items.map((item, index) => {
            const id = cardKey(item, index);
            return <MediaCard key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
          })}
        </MediaGrid>
      )}
    </PageShell>
  );
};

export default FranchisePage;
