import { CitySearch } from '../search/CitySearch';
import { BarChart3 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface HeaderProps {
  city: string;
  onCityChange: (city: string) => void;
}

export function Header({ city, onCityChange }: HeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { label: 'Dashboard', path: '/' },
    { label: 'Brief', path: '/brief' },
    { label: 'Changes', path: '/changes' },
    { label: 'Compare', path: '/compare' },
  ];

  return (
    <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 shrink-0">
            <BarChart3 size={22} style={{ color: '#a5b4fc' }} />
            <span className="text-lg font-bold whitespace-nowrap hidden sm:inline" style={{ color: '#a5b4fc' }}>city-data</span>
          </div>

          <div className="flex-1 max-w-sm mx-4 sm:mx-6">
            <CitySearch value={city} onChange={onCityChange} />
          </div>

          <nav className="flex gap-0.5 shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                style={{
                  background: location.pathname === tab.path ? 'var(--bg-input)' : 'transparent',
                  color: location.pathname === tab.path ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
