import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { fetchCities } from '../../api/client';

interface CitySearchProps {
  value: string;
  onChange: (city: string) => void;
}

export function CitySearch({ value, onChange }: CitySearchProps) {
  const [input, setInput] = useState(value);
  const [cities, setCities] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchCities().then(setCities).catch(() => {});
  }, []);

  useEffect(() => {
    setInput(value);
  }, [value]);

  useEffect(() => {
    if (!input || input === value) {
      setFiltered([]);
      return;
    }
    const q = input.toLowerCase();
    setFiltered(cities.filter(c => c.toLowerCase().includes(q)).slice(0, 8));
  }, [input, cities, value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(city: string) {
    setInput(city);
    onChange(city);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && input) {
      select(filtered[0] || input);
    }
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center rounded-lg px-3 py-2" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', minWidth: '220px' }}>
        <Search size={16} className="shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search city..."
          className="bg-transparent border-none outline-none ml-2 w-full text-sm"
          style={{ color: 'var(--text-primary)', minWidth: '160px' }}
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-50 shadow-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {filtered.map(city => (
            <button
              key={city}
              onClick={() => select(city)}
              className="block w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {city}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
