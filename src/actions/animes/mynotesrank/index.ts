import type { AnimesDashboard } from "@/actions/animes/dashboard";

// Section "Seu Rank de Notas" (Firebase): pega a fatia do dashboard com as notas que o usuário deu a animes.
// A categoria de cada título é a do card quando foi avaliado ou seguido; os registros antigos são completados sozinhos no TMDb.
// usado em: página Animes
export const useAnimesMyNotesRank = (dashboard: AnimesDashboard) => dashboard.firebase.myNotes;
