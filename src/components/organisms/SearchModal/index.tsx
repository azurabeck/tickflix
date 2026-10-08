import { Search } from "lucide-react";
import MediaGrid from "@/components/atoms/MediaGrid";
import Modal from "@/components/atoms/Modal";
import Spinner from "@/components/atoms/Spinner";
import StatusMessage from "@/components/atoms/StatusMessage";
import MediaCard from "@/components/molecules/MediaCard";
import { cardKey, useOpenCard } from "@/actions/helpers/opencard";
import { useSearch } from "@/actions/helpers/search";
import "./style.scss";

// Busca global (lupa da barra): resultados como cards, com check/nota/trailer direto no modal.
const SearchModal = ({ onClose }: { onClose: () => void }) => {
  const { query, setQuery, items, loading, error, search } = useSearch();
  const open = useOpenCard(items ?? []);

  return (
    <Modal onClose={onClose} size="lg" scroll="content">
      <div className="search-modal__bar">
        <input
          type="text"
          className="search-modal__input"
          placeholder="Procurar filme ou série"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          autoFocus
        />
        <button type="button" className="search-modal__button" onClick={search} disabled={loading}>
          {loading ? <Spinner size={16} /> : <Search size={16} />}
        </button>
      </div>

      {error && <StatusMessage variant="error">{error}</StatusMessage>}

      {items && (
        <div className="search-modal__results">
          {items.length === 0 && <StatusMessage variant="empty">Nada encontrado.</StatusMessage>}
          <MediaGrid variant="modal" scroll>
            {items.map((item, index) => {
              const id = cardKey(item, index);
              return <MediaCard isModal key={id} item={item} isOpen={open.openKey === id} onSelect={() => open.setOpenKey(id)} />;
            })}
          </MediaGrid>
        </div>
      )}
    </Modal>
  );
};

export default SearchModal;
