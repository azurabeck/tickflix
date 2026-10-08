import type { SeriesDashboard } from "@/actions/series/dashboard";

// Section "Seu Rank de Notas" (Firebase): pega a fatia do dashboard com as notas que o usuário deu a séries.
// A categoria de cada título é a do card quando foi avaliado ou seguido; os registros antigos são completados sozinhos no TMDb.
// usado em: página Séries
export const useSeriesMyNotesRank = (dashboard: SeriesDashboard) => dashboard.firebase.myNotes;
