import { useCityData } from '../hooks/useCityData';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { SourceBadge } from '../components/common/SourceBadge';
import { FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';

interface BriefingSection {
  title: string;
  content: string;
  source: string;
}

interface BriefingResult {
  city: string;
  generatedAt: string;
  sections: BriefingSection[];
  dataSources: {
    available: string[];
    unavailable: string[];
  };
}

/** Render markdown-ish content: bold, bullets, alerts, line breaks */
function MarkdownContent({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        // Bold header lines like **Denver**
        if (/^\*\*[^*]+\*\*$/.test(line.trim())) {
          const text = line.trim().replace(/\*\*/g, '');
          return <div key={i} className="text-base font-semibold mt-3 mb-1" style={{ color: 'var(--text-primary)' }}>{text}</div>;
        }

        // Bullet lines
        if (line.trim().startsWith('- ')) {
          const content = line.trim().slice(2);
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(content) }} />
            </div>
          );
        }

        // Regular line
        return <div key={i} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
      })}
    </div>
  );
}

/** Format inline markdown: **bold**, ✓/✗ markers, alerts */
function formatInline(text: string): string {
  // Bold
  let html = text.replace(/\*\*([^*]+)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>');
  // Alert markers
  html = html.replace(/⚠/g, '<span style="color: #eab308">⚠</span>');
  // Check/cross markers
  html = html.replace(/✓/g, '<span style="color: #22c55e">✓</span>');
  html = html.replace(/✗/g, '<span style="color: #ef4444">✗</span>');
  return html;
}

function DataSourcesPanel({ available, unavailable }: { available: string[]; unavailable: string[] }) {
  const total = available.length + unavailable.length;
  const pct = total > 0 ? Math.round((available.length / total) * 100) : 0;

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Data Sources
        </h3>
        <span className="text-xs font-mono px-2 py-1 rounded-full" style={{
          background: pct > 50 ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
          color: pct > 50 ? '#22c55e' : '#eab308',
        }}>
          {available.length}/{total} active
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-4" style={{ background: 'var(--bg-input)' }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${pct}%`,
          background: pct > 50 ? '#22c55e' : '#eab308',
        }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: '#22c55e' }}>Available</div>
          {available.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5">
              <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
        <div>
          <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Needs API Key</div>
          {unavailable.map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 py-0.5">
              <XCircle size={12} style={{ color: '#4b5563' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props { city: string }

export function BriefingPage({ city }: Props) {
  const { data, loading, error } = useCityData<BriefingResult>('briefing', city);

  if (loading) return <LoadingSpinner text="Generating city brief..." />;
  if (error) return <ErrorCard message={error} />;
  if (!data) return null;

  // Filter out the meta "Data Sources" section — we render that separately
  const contentSections = data.sections.filter(s => s.source !== 'meta');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <FileText size={24} style={{ color: '#a5b4fc' }} />
        <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>{data.city} — City Brief</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        <Clock size={12} className="inline mr-1" style={{ verticalAlign: 'middle' }} />
        Generated {new Date(data.generatedAt).toLocaleString()} · {data.dataSources.available.length} of {data.dataSources.available.length + data.dataSources.unavailable.length} sources
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          {contentSections.map((section, i) => (
            <div key={i} className="rounded-xl p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
                <SourceBadge source={section.source} />
              </div>
              <MarkdownContent text={section.content} />
            </div>
          ))}

          {contentSections.length === 0 && (
            <div className="rounded-xl p-8 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                No data sections available. Add API keys to unlock more sources.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar — 1/3 width */}
        <div className="space-y-4">
          <DataSourcesPanel
            available={data.dataSources.available}
            unavailable={data.dataSources.unavailable}
          />
        </div>
      </div>
    </div>
  );
}
