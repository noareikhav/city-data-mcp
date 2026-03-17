import { useState, useEffect } from 'react';
import { fetchApi } from '../api/client';

interface UseCityDataResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useCityData<T>(endpoint: string, city: string | undefined): UseCityDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;
    setLoading(true);
    setError(null);
    setData(null);

    fetchApi<T>(`/${endpoint}/${encodeURIComponent(city)}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [endpoint, city]);

  return { data, loading, error };
}
