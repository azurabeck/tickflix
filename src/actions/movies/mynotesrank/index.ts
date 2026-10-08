import type { PageDashboard } from "@/actions/helpers/section";

// Section "Seu Rank de Notas" (Firebase): pega a fatia do dashboard com as notas que o usuário deu a filmes.
// usado em: página Filmes
export const useMoviesMyNotesRank = (dashboard: PageDashboard) => dashboard.firebase.myNotes;
