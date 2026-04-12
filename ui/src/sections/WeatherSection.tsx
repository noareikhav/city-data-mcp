import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { CloudSun, AlertTriangle } from 'lucide-react';

interface WeatherData {
  city: string;
  current: {
    temperature: number;
    temperatureUnit: string;
    shortForecast: string;
    windSpeed: string;
    windDirection: string;
    humidity?: number;
  };
  forecast: Array<{
    name: string;
    temperature: number;
    temperatureUnit: string;
    shortForecast: string;
    windSpeed: string;
    isDaytime: boolean;
  }>;
  alerts: Array<{
    event: string;
    headline: string;
    severity: string;
  }>;
}

export function WeatherSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<WeatherData>('weather', city);

  if (loading) return <LoadingSpinner text="Loading weather..." />;
  if (error) return <ErrorCard title="Weather" message={error} />;
  if (!data) return null;

  const alertColors: Record<string, string> = {
    Extreme: '#ef4444', Severe: '#f97316', Moderate: '#eab308', Minor: '#60a5fa',
  };

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Weather & Alerts</h2>

      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <div className="space-y-2 mb-4">
          {data.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 rounded-xl px-4 py-3" style={{
              background: `${alertColors[alert.severity] || '#eab308'}10`,
              border: `1px solid ${alertColors[alert.severity] || '#eab308'}30`,
            }}>
              <AlertTriangle size={16} style={{ color: alertColors[alert.severity] || '#eab308', marginTop: 2 }} />
              <div>
                <span className="text-sm font-semibold" style={{ color: alertColors[alert.severity] || '#eab308' }}>{alert.event}</span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{alert.headline}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current conditions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <MetricCard
          label="Temperature"
          value={`${data.current.temperature}°${data.current.temperatureUnit || 'F'}`}
          source="NWS"
        />
        <MetricCard
          label="Conditions"
          value={data.current.shortForecast}
          source="NWS"
        />
        <MetricCard
          label="Wind"
          value={`${data.current.windSpeed} ${data.current.windDirection}`}
          source="NWS"
        />
        {data.current.humidity != null && (
          <MetricCard
            label="Humidity"
            value={`${data.current.humidity}%`}
            source="NWS"
          />
        )}
      </div>

      {/* Forecast */}
      {data.forecast?.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {data.forecast.slice(0, 6).map((f, i) => (
            <div key={i} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <CloudSun size={12} style={{ color: f.isDaytime ? '#fbbf24' : '#818cf8' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{f.name}</span>
              </div>
              <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{f.temperature}°{f.temperatureUnit}</div>
              <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{f.shortForecast}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
