// Chama uma função do backend (api/dashboard ou api/series) com os parâmetros da página e devolve o JSON.
// usado em: helpers/pagebackend, presentation/cyclerender
export const fetchBackend = async <T>(endpoint: "dashboard" | "series", params: Record<string, string | undefined>): Promise<T> => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, value);
  }
  const response = await fetch(`/api/${endpoint}?${search.toString()}`);
  if (!response.ok) throw new Error(`API respondeu ${response.status}`);
  return (await response.json()) as T;
};
