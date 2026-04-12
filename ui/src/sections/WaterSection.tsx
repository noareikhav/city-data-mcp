import { useCityData } from '../hooks/useCityData';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { Droplets } from 'lucide-react';

interface WaterValue {
  parameter: string;
  parameterName: string;
  value: number;
  unit: string;
  dateTime: string;
}

interface WaterSite {
  siteName: string;
  siteId: string;
  latitude: number;
  longitude: number;
  values: WaterValue[];
}

interface WaterData {
  city: string;
  sites: WaterSite[];
  queryTime: string;
}

export function WaterSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<WaterData>('water', city);

  if (loading) return <LoadingSpinner text="Loading water data..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data?.sites?.length) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Water Conditions</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        USGS Real-Time Monitoring — {data.sites.length} sites nearby
      </p>

      <div className="space-y-3">
        {data.sites.slice(0, 4).map(site => (
          <div key={site.siteId} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Droplets size={14} style={{ color: '#60a5fa' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{site.siteName}</span>
              <span className="text-[10px] ml-auto" style={{ color: 'var(--text-muted)' }}>{site.siteId}</span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {(site.values || []).map((v, i) => (
                <div key={i} className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-body)' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {v.parameterName || v.parameter}
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {typeof v.value === 'number' ? v.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : String(v.value)}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{v.unit}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
