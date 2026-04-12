import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, Database } from 'lucide-react';
import { mcpInit, mcpCallTool, mcpText } from '../../mcp/client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
  timestamp: Date;
}

const STARTERS = [
  'What are the key economic trends?',
  'How is the housing market?',
  'What public health challenges exist?',
  'Compare unemployment to national average',
  'What are the biggest safety concerns?',
  'Give me a full city briefing',
];

// Map natural language intents to MCP tool calls
function inferToolCalls(query: string, city: string): Array<{ tool: string; args: Record<string, unknown> }> {
  const q = query.toLowerCase();
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];

  if (q.includes('briefing') || q.includes('overview') || q.includes('everything') || q.includes('full'))
    calls.push({ tool: 'create_city_briefing', args: { city } });
  if (q.includes('econom') || q.includes('gdp') || q.includes('income') || q.includes('fred'))
    calls.push({ tool: 'query_economics', args: { city } });
  if (q.includes('unemploy') || q.includes('jobs') || q.includes('employment') || q.includes('labor'))
    calls.push({ tool: 'query_employment', args: { city } });
  if (q.includes('housing') || q.includes('rent') || q.includes('home value') || q.includes('afford'))
    calls.push({ tool: 'query_housing', args: { city } });
  if (q.includes('crime') || q.includes('safety') || q.includes('violen'))
    calls.push({ tool: 'query_national_crime', args: { city } });
  if (q.includes('health') || q.includes('obesity') || q.includes('mental') || q.includes('diabetes'))
    calls.push({ tool: 'query_public_health', args: { city } });
  if (q.includes('homeless'))
    calls.push({ tool: 'query_homelessness', args: { city } });
  if (q.includes('weather') || q.includes('temperature') || q.includes('forecast'))
    calls.push({ tool: 'query_weather', args: { city } });
  if (q.includes('air quality') || q.includes('aqi') || q.includes('pollution'))
    calls.push({ tool: 'query_air_quality', args: { city } });
  if (q.includes('school') || q.includes('education') || q.includes('enrollment'))
    calls.push({ tool: 'query_schools', args: { city } });
  if (q.includes('budget') || q.includes('spending') || q.includes('government'))
    calls.push({ tool: 'query_budget', args: { city } });
  if (q.includes('transit') || q.includes('transport') || q.includes('bus') || q.includes('subway'))
    calls.push({ tool: 'query_transit', args: { city } });
  if (q.includes('water') || q.includes('stream') || q.includes('river'))
    calls.push({ tool: 'query_water', args: { city } });
  if (q.includes('demograph') || q.includes('population') || q.includes('census'))
    calls.push({ tool: 'query_demographics', args: { city } });
  if (q.includes('traffic') || q.includes('crash') || q.includes('fatality'))
    calls.push({ tool: 'query_traffic', args: { city } });
  if (q.includes('cost of living') || q.includes('cpi') || q.includes('inflation') || q.includes('expensive'))
    calls.push({ tool: 'query_cost_of_living', args: { city } });
  if (q.includes('migrat') || q.includes('moving') || q.includes('growth'))
    calls.push({ tool: 'query_migration', args: { city } });
  if (q.includes('311') || q.includes('complaint') || q.includes('pothole') || q.includes('noise'))
    calls.push({ tool: 'query_311_trends', args: { city } });
  if (q.includes('permit') || q.includes('construction') || q.includes('building'))
    calls.push({ tool: 'query_permits', args: { city } });
  if (q.includes('representative') || q.includes('elected') || q.includes('mayor') || q.includes('council'))
    calls.push({ tool: 'query_representatives', args: { city } });

  // If question mentions an issue topic, use map_issue_data
  if (q.includes('issue') || q.includes('concern') || q.includes('problem') || q.includes('challenge'))
    calls.push({ tool: 'map_issue_data', args: { city, issue: query } });

  // If question mentions trends/changes
  if (q.includes('trend') || q.includes('chang') || q.includes('improv') || q.includes('declin'))
    calls.push({ tool: 'track_city_changes', args: { city } });

  // Default: demographics + economics if nothing matched
  if (calls.length === 0) {
    calls.push({ tool: 'map_issue_data', args: { city, issue: query } });
  }

  return calls;
}

/** Render markdown-ish text */
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        if (line.startsWith('# '))
          return <div key={i} className="text-base font-bold mt-2" style={{ color: 'var(--text-primary)' }}>{line.slice(2)}</div>;
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

interface ChatPanelProps {
  city: string;
}

export function ChatPanel({ city }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevCityRef = useRef(city);

  // Reset chat when city changes
  useEffect(() => {
    if (prevCityRef.current !== city) {
      setMessages([]);
      prevCityRef.current = city;
    }
  }, [city]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const query = text || input.trim();
    if (!query || loading) return;
    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: query, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      await mcpInit();
      const toolCalls = inferToolCalls(query, city);

      // Show tool indicators
      for (const { tool } of toolCalls) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          role: 'tool',
          content: `Fetching ${tool.replace(/_/g, ' ').replace('query ', '')}...`,
          toolName: tool,
          timestamp: new Date(),
        }]);
      }

      // Execute tool calls in parallel
      const results = await Promise.allSettled(
        toolCalls.map(({ tool, args }) => mcpCallTool(tool, args))
      );

      // Combine results
      const texts: string[] = [];
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === 'fulfilled') {
          texts.push(mcpText(r.value));
        } else {
          texts.push(`_Error fetching ${toolCalls[i].tool}: ${r.reason}_`);
        }
      }

      // Remove tool indicators, add combined response
      setMessages(prev => {
        const withoutTools = prev.filter(m => m.role !== 'tool');
        return [...withoutTools, {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: texts.join('\n\n---\n\n'),
          timestamp: new Date(),
        }];
      });
    } catch (err) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, city]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 100); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          style={{ background: '#6366f1' }}
        >
          <MessageCircle size={24} color="white" />
        </button>
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 z-50 h-full flex flex-col transition-transform duration-300"
        style={{
          width: '420px',
          maxWidth: '100vw',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          background: 'var(--bg-body)',
          borderLeft: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0" style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Database size={16} style={{ color: '#a5b4fc' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Ask about {city}
            </span>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-white/5">
            <X size={18} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-center mb-4" style={{ color: 'var(--text-muted)' }}>
                Ask questions about {city}'s data — powered by 28 MCP tools across 20+ government sources
              </p>
              <div className="grid gap-2">
                {STARTERS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    className="text-left text-xs px-3 py-2 rounded-lg transition-colors hover:brightness-110"
                    style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => {
            if (msg.role === 'tool') {
              return (
                <div key={msg.id} className="flex items-center gap-2 text-xs animate-pulse" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 size={12} className="animate-spin" />
                  {msg.content}
                </div>
              );
            }
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl text-sm" style={{ background: '#6366f1', color: 'white' }}>
                    {msg.content}
                  </div>
                </div>
              );
            }
            return (
              <div key={msg.id} className="max-w-[95%]">
                <div className="px-3 py-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                  <Markdown text={msg.content} />
                </div>
              </div>
            );
          })}

          {loading && messages.filter(m => m.role === 'tool').length === 0 && (
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Loader2 size={12} className="animate-spin" />
              Thinking...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="shrink-0 px-4 pb-4 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask about ${city}...`}
              rows={1}
              className="flex-1 resize-none rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-3 rounded-lg transition-opacity disabled:opacity-30"
              style={{ background: '#6366f1' }}
            >
              <Send size={16} color="white" />
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
