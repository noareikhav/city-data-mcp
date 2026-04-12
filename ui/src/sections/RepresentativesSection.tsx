import { useCityData } from '../hooks/useCityData';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { User, Mail, Globe, Phone } from 'lucide-react';

interface Official {
  name: string;
  office: string;
  party: string;
  phones?: string[];
  urls?: string[];
  emails?: string[];
  photoUrl?: string;
  level: string;
}

interface RepresentativesData {
  address: string;
  officials: Official[];
}

const PARTY_COLORS: Record<string, string> = {
  Democratic: '#60a5fa',
  Republican: '#f87171',
  Independent: '#a78bfa',
  Nonpartisan: '#8b949e',
  Libertarian: '#fbbf24',
};

const LEVEL_ORDER = ['federal', 'state', 'local'];

export function RepresentativesSection({ city }: { city: string }) {
  const { data, loading, error } = useCityData<RepresentativesData>('representatives', city);

  if (loading) return <LoadingSpinner text="Loading representatives..." />;
  if (error) return <ErrorCard title="Representatives" message={error} />;
  if (!data?.officials?.length) return null;

  // Group by level
  const byLevel: Record<string, Official[]> = {};
  for (const o of data.officials) {
    const level = o.level || 'other';
    if (!byLevel[level]) byLevel[level] = [];
    byLevel[level].push(o);
  }

  const sortedLevels = Object.keys(byLevel).sort((a, b) => {
    const ai = LEVEL_ORDER.indexOf(a);
    const bi = LEVEL_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Elected Representatives</h2>
      <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
        Google Civic — {data.officials.length} officials for "{data.address}"
      </p>

      <div className="space-y-4">
        {sortedLevels.map(level => (
          <div key={level}>
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              {level === 'federal' ? 'Federal' : level === 'state' ? 'State' : level === 'local' ? 'Local' : level}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {byLevel[level].map((o, i) => {
                const partyColor = PARTY_COLORS[o.party] || '#8b949e';
                return (
                  <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `${partyColor}20` }}>
                      <User size={14} style={{ color: partyColor }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{o.name}</div>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{o.office}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                          style={{ color: partyColor, background: `${partyColor}15`, border: `1px solid ${partyColor}30` }}>
                          {o.party || 'Unknown'}
                        </span>
                        {o.emails?.[0] && (
                          <a href={`mailto:${o.emails[0]}`} className="hover:brightness-125">
                            <Mail size={11} style={{ color: 'var(--text-muted)' }} />
                          </a>
                        )}
                        {o.urls?.[0] && (
                          <a href={o.urls[0]} target="_blank" rel="noopener noreferrer" className="hover:brightness-125">
                            <Globe size={11} style={{ color: 'var(--text-muted)' }} />
                          </a>
                        )}
                        {o.phones?.[0] && (
                          <a href={`tel:${o.phones[0]}`} className="hover:brightness-125">
                            <Phone size={11} style={{ color: 'var(--text-muted)' }} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
