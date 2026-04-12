import { useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { MapPin, Key, ChevronDown, ChevronUp } from 'lucide-react';
import { OverviewSection } from '../sections/OverviewSection';
import { DemographicsSection } from '../sections/DemographicsSection';
import { EconomySection } from '../sections/EconomySection';
import { CostOfLivingSection } from '../sections/CostOfLivingSection';
import { HousingSection } from '../sections/HousingSection';
import { MigrationSection } from '../sections/MigrationSection';
import { SafetySection } from '../sections/SafetySection';
import { PublicHealthSection } from '../sections/PublicHealthSection';
import { HomelessnessSection } from '../sections/HomelessnessSection';
import { QualitySection } from '../sections/QualitySection';
import { WeatherSection } from '../sections/WeatherSection';
import { WaterSection } from '../sections/WaterSection';
import { ThreeElevenSection } from '../sections/ThreeElevenSection';
import { GovernmentSection } from '../sections/GovernmentSection';
import { RepresentativesSection } from '../sections/RepresentativesSection';

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
            <div><span style={{color:'#818cf8'}}>CENSUS_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← api.census.gov/data/key_signup.html</span></div>
            <div><span style={{color:'#818cf8'}}>FRED_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← fred.stlouisfed.org/docs/api/api_key.html</span></div>
            <div><span style={{color:'#818cf8'}}>AIRNOW_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← docs.airnowapi.org/account/request</span></div>
            <div><span style={{color:'#818cf8'}}>GOOGLE_CIVIC_API_KEY</span>=… <span style={{color:'var(--text-muted)'}}>← console.cloud.google.com/apis</span></div>
          </div>
          <p className="mt-2">Data sources without keys (Budget, 311, Transit, Schools) will load automatically.</p>
        </div>
      )}
    </div>
  );
}

/** Per-section error boundary so one broken section doesn't kill the page */
class SectionBoundary extends Component<
  { name: string; children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[Section: ${this.props.name}]`, error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="mb-8 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="text-sm font-medium mb-1" style={{ color: '#f87171' }}>
            {this.props.name} failed to render
          </div>
          <pre className="text-xs" style={{ color: '#fca5a5', whiteSpace: 'pre-wrap' }}>
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
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
          Civic data dashboard — powered by 20+ government data sources
        </p>
      </div>

      <ApiKeyBanner />

      <SectionBoundary name="Overview"><OverviewSection city={city} /></SectionBoundary>
      <SectionBoundary name="Weather"><WeatherSection city={city} /></SectionBoundary>
      <SectionBoundary name="Demographics"><DemographicsSection city={city} /></SectionBoundary>
      <SectionBoundary name="Migration"><MigrationSection city={city} /></SectionBoundary>
      <SectionBoundary name="Economy"><EconomySection city={city} /></SectionBoundary>
      <SectionBoundary name="Cost of Living"><CostOfLivingSection city={city} /></SectionBoundary>
      <SectionBoundary name="Housing"><HousingSection city={city} /></SectionBoundary>
      <SectionBoundary name="Safety"><SafetySection city={city} /></SectionBoundary>
      <SectionBoundary name="Public Health"><PublicHealthSection city={city} /></SectionBoundary>
      <SectionBoundary name="Homelessness"><HomelessnessSection city={city} /></SectionBoundary>
      <SectionBoundary name="Quality of Life"><QualitySection city={city} /></SectionBoundary>
      <SectionBoundary name="Water"><WaterSection city={city} /></SectionBoundary>
      <SectionBoundary name="311 Requests"><ThreeElevenSection city={city} /></SectionBoundary>
      <SectionBoundary name="Government"><GovernmentSection city={city} /></SectionBoundary>
      <SectionBoundary name="Representatives"><RepresentativesSection city={city} /></SectionBoundary>
    </div>
  );
}
