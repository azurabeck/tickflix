import { useEffect, useRef, useState } from "react";
import { useMediaCards } from "@/contexts/MediaCards";
import { auth } from "@/service/FirebaseSettings";
import { syncAwardTimeline } from "@/actions/awards/timelinesync";
import {
  fetchAllSavedAwardEditions,
  fetchAwardEditionFromFirestore,
  getAwardEditions,
  type AwardCategory,
  type AwardConfig,
  type AwardEdition,
  type AwardNominee,
} from "@/actions/awards/editions";

// Ciclo "página de uma premiação": edições (grade) -> edição escolhida -> indicados + disponibilidade;
// marcar um filme como visto mantém a timeline da edição em dia.
// usado em: página Premiações
export const useAwardsDashboard = (config: AwardConfig) => {
  const uid = auth.currentUser?.uid ?? null;
  const media = useMediaCards();
  const [editions, setEditions] = useState<AwardEdition[]>(() => getAwardEditions(config));
  const [selectedOrdinal, setSelectedOrdinal] = useState<number | null>(null);
  const [selectedNominee, setSelectedNominee] = useState<AwardNominee | null>(null);
  const [addDataOpen, setAddDataOpen] = useState(false);

  const selectedEdition = editions.find((e) => e.ordinal === selectedOrdinal) ?? null;

  // Trocar de premiação reaproveita o componente: reinicia o estado.
  useEffect(() => {
    setEditions(getAwardEditions(config));
    setSelectedOrdinal(null);
    setSelectedNominee(null);
    setAddDataOpen(false);
  }, [config]);

  // Uma leitura só da coleção inteira: a grade já abre mostrando o vencedor de quem foi resolvido.
  useEffect(() => {
    fetchAllSavedAwardEditions(config)
      .then((saved) => {
        if (saved.size === 0) return;
        setEditions((prev) =>
          prev.map((edition) => {
            const match = saved.get(edition.ordinal);
            return match ? { ...edition, headline: match.headline, categories: match.categories } : edition;
          })
        );
      })
      .catch((err) => console.error(`Erro ao buscar edições do ${config.name} já resolvidas:`, err));
  }, [config]);

  // Edição sem dado ainda: tenta achar já salva no Firestore.
  useEffect(() => {
    if (selectedOrdinal === null) return;
    const current = editions.find((e) => e.ordinal === selectedOrdinal);
    if (current?.categories) return;

    fetchAwardEditionFromFirestore(config, selectedOrdinal)
      .then((saved) => {
        if (!saved) return;
        setEditions((prev) => prev.map((e) => (e.ordinal === selectedOrdinal ? { ...e, headline: saved.headline, categories: saved.categories } : e)));
      })
      .catch((err) => console.error(`Erro ao buscar edição do ${config.name} no Firestore:`, err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrdinal, config]);

const lastRevision = useRef(media.watchedRevision);
  useEffect(() => {
    if (media.watchedRevision === lastRevision.current) return;
    lastRevision.current = media.watchedRevision;
    if (uid && selectedEdition) {
      syncAwardTimeline(uid, config, selectedEdition).catch((err) => console.error(`Erro ao sincronizar timeline da edição do ${config.name}:`, err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.watchedRevision]);

  const saveEditionData = (headline: string, categories: AwardCategory[]) => {
    if (!selectedEdition) return;
    setEditions((prev) => prev.map((e) => (e.ordinal === selectedEdition.ordinal ? { ...e, headline, categories } : e)));
    setAddDataOpen(false);
  };

  return { uid, editions, selectedEdition, setSelectedOrdinal, selectedNominee, setSelectedNominee, addDataOpen, setAddDataOpen, saveEditionData };
};
