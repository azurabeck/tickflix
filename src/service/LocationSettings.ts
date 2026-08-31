// src/service/LocationSettings.ts
// Localização do usuário — usada por "Em cartaz em {cidade}" na Home
// (pedido explícito da Rebecca: trocar o "Brazil" fixo por local de
// verdade) e por "onde assistir" no MovieDetail/NomineeDetail (o TMDb
// /watch/providers precisa de um código de país ISO 3166-1, não cidade).
// Geolocation do navegador (pede permissão) + reverse geocoding via
// Nominatim (OpenStreetMap, gratuito, aceita chamada cross-origin direto
// do browser — testado de fora do domínio deles, funciona, sem precisar
// de proxy/backend). Se o usuário negar a permissão (ou o navegador não
// tiver geolocation), volta tudo `null` — não é erro, é escolha do
// usuário; quem chama cai pro próprio fallback (ex.: "Brazil"/país "BR").
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

export interface CurrentLocation {
  city: string | null;
  // ISO 3166-1 alpha-2 em maiúsculo (ex.: "BR") — Nominatim devolve em
  // minúsculo, convertido aqui pro formato que o TMDb espera.
  countryCode: string | null;
}

const resolveCurrentLocation = async (): Promise<CurrentLocation> => {
  const empty: CurrentLocation = { city: null, countryCode: null };
  if (!navigator.geolocation) return empty;

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null), // negou permissão / indisponível
      { timeout: 8000 }
    );
  });
  if (!position) return empty;

  try {
    const query = new URLSearchParams({
      format: "json",
      lat: String(position.coords.latitude),
      lon: String(position.coords.longitude),
    });
    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${query.toString()}`, {
      headers: { "Accept-Language": "pt-BR" },
    });
    if (!response.ok) return empty;

    const data = await response.json();
    const city = data.address?.city ?? data.address?.town ?? data.address?.municipality ?? null;
    const countryCode: string | null = data.address?.country_code ? String(data.address.country_code).toUpperCase() : null;
    return { city, countryCode };
  } catch (err) {
    console.error("Erro ao resolver a localização atual:", err);
    return empty;
  }
};

// Cacheada em memória (só resolve uma vez por sessão do app) — sem isso,
// cada modal de detalhe aberto (NomineeDetail, MovieDetail) pediria
// geolocation + bateria de novo no Nominatim (serviço gratuito com rate
// limit), só pra chegar sempre na mesma resposta.
let locationCache: Promise<CurrentLocation> | null = null;

export const fetchCurrentLocation = (): Promise<CurrentLocation> => {
  if (!locationCache) locationCache = resolveCurrentLocation();
  return locationCache;
};

// Mantido por compatibilidade com quem só precisa da cidade (Home, "Em
// cartaz em {cidade}") — usa o mesmo cache acima por baixo.
export const fetchCurrentCityName = async (): Promise<string | null> => (await fetchCurrentLocation()).city;
