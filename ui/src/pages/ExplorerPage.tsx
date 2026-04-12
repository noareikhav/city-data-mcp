import { useState, useEffect } from 'react';
import { Search, Play, ChevronDown, ChevronRight, Loader2, Copy, Check, Wrench } from 'lucide-react';
import { mcpListTools, mcpCallTool, mcpText, type McpTool } from '../mcp/client';

/** Render markdown-ish text */
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('# '))
          return <div key={i} className="text-base font-bold mt-3" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</div>;
        if (line.startsWith('## '))
          return <div key={i} className="text-sm font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>{line.slice(3)}</div>;
        if (/^\*\*[^*]+\*\*$/.test(line.trim()))
          return <div key={i} className="font-semibold mt-2" style={{ color: 'var(--text-primary)' }}>{line.replace(/\*\*/g, '')}</div>;
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          const content = line.trim().replace(/^[-•]\s*/, '');
          return (
            <div key={i} className="flex gap-2 pl-2">
              <span style={{ color: 'var(--text-muted)' }}>•</span>
              <span dangerouslySetInnerHTML={{ __html: content.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }} />
            </div>
          );
        }
        return <div key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>') }} />;
      })}
    </div>
  );
}

function ToolCard({ tool, city }: { tool: McpTool; city: string }) {
  const [expanded, setExpanded] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [args, setArgs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  // Extract input properties from schema
  const schema = tool.inputSchema as { properties?: Record<string, { type?: string; description?: string; enum?: string[] }>; required?: string[] };
  const properties = schema.properties || {};
  const required = schema.required || [];

  // Pre-fill city arg
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const [key] of Object.entries(properties)) {
      if (key === 'city' || key === 'address') init[key] = city;
    }
    setArgs(init);
  }, [city, tool.name]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const callArgs: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(args)) {
        if (val) {
          // Parse numbers if the schema says it's a number
          if (properties[key]?.type === 'number') callArgs[key] = Number(val);
          else if (key === 'cities') callArgs[key] = val.split(',').map(s => s.trim());
          else callArgs[key] = val;
        }
      }
      const res = await mcpCallTool(tool.name, callArgs);
      setResult(mcpText(res));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Categorize tool
  const category = tool.name.startsWith('query_') ? 'Data' :
    tool.name.startsWith('create_') ? 'Analysis' :
    tool.name.startsWith('compare_') ? 'Compare' :
    tool.name.startsWith('track_') || tool.name.startsWith('map_') ? 'Analysis' :
    tool.name.startsWith('search_') ? 'Search' : 'Other';

  const categoryColors: Record<string, string> = {
    Data: '#60a5fa', Analysis: '#a78bfa', Compare: '#34d399', Search: '#fbbf24', Other: '#8b949e',
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      {/* Tool header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-110 transition-all"
      >
        {expanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
        <Wrench size={14} style={{ color: categoryColors[category] }} />
        <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
          {tool.name}
        </span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
          style={{ color: categoryColors[category], background: `${categoryColors[category]}15`, border: `1px solid ${categoryColors[category]}30` }}>
          {category}
        </span>
        {tool.title && (
          <span className="text-xs ml-auto truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
            {tool.title}
          </span>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {/* Description */}
          <p className="text-xs pt-3 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>
            {tool.description.split('\n').slice(0, 3).join('\n')}
          </p>

          {/* Input fields */}
          {Object.keys(properties).length > 0 && (
            <div className="space-y-2">
              {Object.entries(properties).map(([key, prop]) => (
                <div key={key}>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>
                    {key} {required.includes(key) && <span style={{ color: '#ef4444' }}>*</span>}
                  </label>
                  {prop.enum ? (
                    <select
                      value={args[key] || ''}
                      onChange={e => setArgs(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                    >
                      <option value="">Select...</option>
                      {prop.enum.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={args[key] || ''}
                      onChange={e => setArgs(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={prop.description || key}
                      className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
                      style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#6366f1', color: 'white' }}
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {loading ? 'Running...' : 'Run Tool'}
          </button>

          {/* Error */}
          {error && (
            <div className="text-xs p-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="relative">
              <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1 rounded hover:bg-white/10"
                title="Copy result"
              >
                {copied ? <Check size={12} style={{ color: '#4ade80' }} /> : <Copy size={12} style={{ color: 'var(--text-muted)' }} />}
              </button>
              <div className="p-3 rounded-lg max-h-[400px] overflow-y-auto" style={{ background: 'var(--bg-body)', border: '1px solid var(--border-subtle)' }}>
                <Markdown text={result} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ExplorerPage({ city }: { city: string }) {
  const [tools, setTools] = useState<McpTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setLoading(true);
    mcpListTools()
      .then(setTools)
      .catch(err => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tools.filter(t => {
    const q = search.toLowerCase();
    const matchesSearch = !q || t.name.includes(q) || (t.description || '').toLowerCase().includes(q) || (t.title || '').toLowerCase().includes(q);
    const category = t.name.startsWith('query_') ? 'data' :
      t.name.startsWith('create_') || t.name.startsWith('track_') || t.name.startsWith('map_') ? 'analysis' :
      t.name.startsWith('compare_') ? 'compare' :
      t.name.startsWith('search_') || t.name.startsWith('list_') ? 'discovery' : 'other';
    const matchesFilter = filter === 'all' || category === filter;
    return matchesSearch && matchesFilter;
  });

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'data', label: 'Data' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'compare', label: 'Compare' },
    { key: 'discovery', label: 'Discovery' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-20">
        <Loader2 size={20} className="animate-spin" style={{ color: '#6366f1' }} />
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Connecting to MCP server...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm" style={{ color: '#f87171' }}>Failed to connect: {error}</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-xs px-3 py-1 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Wrench size={20} style={{ color: '#6366f1' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>MCP Tool Explorer</h1>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {tools.length} tools available — call any tool interactively. City pre-filled with "{city}".
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tools..."
            className="w-full rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
        <div className="flex gap-1">
          {categories.map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: filter === c.key ? 'var(--bg-input)' : 'transparent',
                color: filter === c.key ? 'var(--text-primary)' : 'var(--text-muted)',
                border: filter === c.key ? '1px solid var(--border-subtle)' : '1px solid transparent',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tool list */}
      <div className="space-y-2">
        {filtered.map(tool => (
          <ToolCard key={tool.name} tool={tool} city={city} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-10 text-sm" style={{ color: 'var(--text-muted)' }}>
          No tools match "{search}"
        </p>
      )}
    </div>
  );
}
