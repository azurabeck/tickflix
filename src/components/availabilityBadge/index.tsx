// src/components/availabilityBadge/index.tsx
// Claquete — "disponível pra assistir" (streaming por assinatura OU
// aluguel, ver @/components/movieDetail/functions.ts `isAvailableToWatch`/
// `fetchAvailabilityMap`) — pedido explícito da Rebecca: "a claquete
// dizendo se o filme ta disponível em streaming ou aluguel, deve aparecer
// em todos os lugares do site, pode virar um padrão do componente global
// de details". Nasceu só na fileira "Principais lançamentos"
// (home/dashboard); virou peça GLOBAL, mesmo padrão de
// @/components/watchButton — quem usa só passa um boolean (geralmente
// `availabilityMap.has(key)`, mesmo formato de `watchedMap`), não sabe
// nada de streaming/provider por dentro.
//
// Diferente do WatchButton (sempre visível, pra poder ALTERNAR "já vi"),
// essa aqui não renderiza nada quando `available` é false — é só um
// SINAL, não tem ação nenhuma pra tomar clicando nela.
//
// Ícone de PLAY, não mais a claquete — pedido explícito da Rebecca: "o
// simbolo de claquete troca pra um simbolo de player... e o simbolo de
// claquete passa a ser pra adicionar a uma timeline". A claquete virou o
// ícone de @/components/addToTimelineButton (ação nova, abre um menu);
// esse selo de disponibilidade ficou com o Play.
import { Play } from "lucide-react";
import "./styles.scss";

interface AvailabilityBadgeProps {
  available: boolean;
}

const AvailabilityBadge = ({ available }: AvailabilityBadgeProps) => {
  if (!available) return null;

  return (
    <span className="availability-badge" title="Disponível em streaming ou aluguel">
      <Play size={12} fill="currentColor" />
    </span>
  );
};

export default AvailabilityBadge;
