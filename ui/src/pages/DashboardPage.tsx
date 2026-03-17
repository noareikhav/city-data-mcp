import { useState, useEffect } from 'react';
import { MapPin, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { OverviewSection } from '../sections/OverviewSection';
import { DemographicsSection } from '../sections/DemographicsSection';
import { EconomySection } from '../sections/EconomySection';
import { HousingSection } from '../sections/HousingSection';
import { SafetySection } from '../sections/SafetySection';
import { QualitySection } from '../sections/QualitySection';
import { GovernmentSection } from '../sections/GovernmentSection';

interface DashboardPageProps {
  city: string;
}

function ApiKeyBanner() {
  const [expanded, setExpanded] = useState(false);

  // Quick check: if a simple API call fails with key error, show banner
  const [show, setShow] = useState(false);
  useEffect(() => {
    fetch('/api/census/Denver')
      .then(r => r.json())
      .then(j => { if (j.error && /API_KEY/i.test(j.error)) setShow(true); })
      .catch(() => {});
  }, []);

  if (!show) return null;

  return (
    <div className="rounded-xl p-4 mb-6" style={{
      background: 'rgba(99,102,241,0.06)',
      border: '1px solid rgba(99,102,241,0.15)',
    }}>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left">
        <Key size={16} style={{ color: '#818cf8' }} />
        <span className="text-sm font-medium" style={{ color: '#a5b4fc' }}>
          Some data sources need API keys to display
        </span>
        <span className="ml-auto">
          {expanded ? <ChevronUp size={14} style={{ color: '#818cf8' }} /> : <ChevronDown size={14} style={{ color: '#818cf8' }} />}
        </span>
      </button>
      {expanded && (
        <div className="mt-3 text-xs leading-relaxed space-y-1" style={{ color: 'var(--text-secondary)' }}>
          <p>Set environment variables before starting the API server:</p>
          <div className="rounded-lg p-3 mt-2 font-mono text-xs" style={{ background: 'var(--bg-input)' }}>
            <div><span style={{color:'#818cf8'}}>CENSUS_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← api.data.gov/signup</span></div>
            <div><span style={{color:'#818cf8'}}>FRED_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← fred.stlouisfed.org</span></div>
            <div><span style={{color:'#818cf8'}}>BLS_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← bls.gov/developers</span></div>
            <div><span style={{color:'#818cf8'}}>AIRNOW_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← airnowapi.org</span></div>
          </div>
          <p className="mt-2">Data sources without keys (Budget, 311, Transit, Schools) will load automatically.</p>
        </div>
      )}
    </div>
  );
}

export function DashboardPage({ city }: DashboardPageProps) {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={20} style={{ color: '#6366f1' }} />
          <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>{city}</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Civic data dashboard — powered by 15+ government data sources
        </p>
      </div>

      <ApiKeyBanner />

      <OverviewSection city={city} />
      <DemographicsSection city={city} />
      <EconomySection city={city} />
      <HousingSection city={city} />
      <SafetySection city={city} />
      <QualitySection city={city} />
      <GovernmentSection city={city} />
    </div>
  );
}
