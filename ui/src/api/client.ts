const API_BASE = '/api';

export async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.data as T;
}

export async function fetchCities(): Promise<string[]> {
  return fetchApi<string[]>('/cities');
}
