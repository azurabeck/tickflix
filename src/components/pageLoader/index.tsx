// src/components/pageLoader/index.tsx
// Load GERAL de página — pedido explícito da Rebecca: "tem muita coisa
// carregando nessa pagina vamos fazer um load geral pra cada página".
// Antes cada fileira (Em cartaz/Bilheteria/Lançamentos...) mostrava o
// próprio spinner independente, piscando a tela aos pedaços conforme
// cada uma resolvia. Esse componente é usado no LUGAR da página inteira
// enquanto os dados "pesados" dela não resolvem (ver `pageReady` em
// cada página) — com o cache de 7 dias (@/service/PageCache), isso só
// aparece de verdade no primeiro acesso ou depois de "Atualizar".
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import "./styles.scss";

const PageLoader = () => {
  const { t } = useTranslation();
  return (
    <div className="page-loader">
      <Loader2 className="page-loader__spinner" size={32} />
      <span>{t("pageLoader.loading")}</span>
    </div>
  );
};

export default PageLoader;
