const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";

interface CurrentLocation {
  city: string | null;
  countryCode: string | null;
}

const resolveCurrentLocation = async (): Promise<CurrentLocation> => {
  const empty: CurrentLocation = { city: null, countryCode: null };
  if (!navigator.geolocation) return empty;

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
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

let locationCache: Promise<CurrentLocation> | null = null;

// Localização aproximada (cidade e país) pelo GPS do navegador, resolvida uma vez só.
// usado no detalhe do título ("onde assistir" no país do usuário) e, pela cidade, no dashboard de Filmes.
export const fetchCurrentLocation = (): Promise<CurrentLocation> => {
  if (!locationCache) locationCache = resolveCurrentLocation();
  return locationCache;
};

// usado no dashboard de Filmes: a section "Em cartaz" busca os filmes da cidade do usuário.
export const fetchCurrentCityName = async (): Promise<string | null> => (await fetchCurrentLocation()).city;
