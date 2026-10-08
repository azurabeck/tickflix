import { useTranslation } from "react-i18next";
import { auth } from "@/service/FirebaseSettings";
import { TMDB_LANGUAGE_BY_APP_LANGUAGE, type SupportedLanguage } from "@/service/i18n";
import { usePageBackend, type BackendOptions } from "@/actions/helpers/pagebackend";
import { usePageFirebase, type FirebaseOptions } from "@/actions/helpers/pagefirebase";

export type { Section } from "@/actions/helpers/pagebackend";

// Dashboard de uma página: junta as duas funções universais que entregam a resposta por section.
//   Backend  (usePageBackend):  cache -> atualizar? -> cidade -> pedido ao backend (um por grupo).
//   Firebase (usePageFirebase): timelines seguidas e o que o MediaCardsProvider já leu (vistos, notas e seguidos).
// As sections só pegam a sua fatia: dashboard.section("nome") e dashboard.firebase.
// usado em: animes/dashboard, helpers/pagebackend, helpers/pagefirebase, movies/dashboard, series/dashboard
export const usePageDashboard = (page: string, options: BackendOptions & FirebaseOptions) => {
  const { i18n } = useTranslation();
  const uid = auth.currentUser?.uid ?? null;
  const lang = TMDB_LANGUAGE_BY_APP_LANGUAGE[(i18n.language ?? "pt").slice(0, 2) as SupportedLanguage] ?? "pt-BR";

  const backend = usePageBackend(page, uid, lang, options);
  const firebase = usePageFirebase(uid, options);

  return { uid, lang, city: backend.city, section: backend.section, firebase };
};

export type PageDashboard = ReturnType<typeof usePageDashboard>;
