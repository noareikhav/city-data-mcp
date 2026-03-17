import { useState } from 'react';
import { CitySearch } from '../components/search/CitySearch';
import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';
import { GitCompareArrows } from 'lucide-react';

interface CensusResult {
  city: string;
  state: string;
  demographics: {
    population: number | null;
    medianAge: number | null;
    medianIncome: number | null;
    perCapitaIncome: number | null;
    povertyRate: number | null;
    bachelorsDegreeRate: number | null;
  };
  housing: {
    medianHomeValue: number | null;
    medianRent: number | null;
    totalHousingUnits: number | null;
    vacancyRate: number | null;
  };
  commuting: {
    driveAloneRate: number | null;
    publicTransitRate: number | null;
    workFromHomeRate: number | null;
  };
}

interface BudgetResult {
  city: string;
  totalBudget: number;
  population: number;
  perCapita: number;
  fiscalYear: string;
}

function CityColumn({ city }: { city: string | undefined }) {
  const census = useCityData<CensusResult>('census', city);
  const budget = useCityData<BudgetResult>('budget', city);

  if (!city) return <div className="flex-1 flex items-center justify-center py-12"><span style={{ color: 'var(--text-muted)' }}>Select a city</span></div>;

  const anyLoading = census.loading || budget.loading;
  const anyError = census.error && !budget.data;
  const noData = !census.data && !budget.data;

  if (anyLoading) return <div className="flex-1"><LoadingSpinner /></div>;
  if (noData && anyError) return <div className="flex-1"><ErrorCard message={census.error || ''} /></div>;
  if (noData) return null;

  const cityName = census.data?.city || city;
  const stateName = census.data?.state || '';

  return (
    <div className="flex-1 space-y-3">
      <h2 className="text-xl font-bold mb-4" style={{ color: '#fff' }}>{cityName}{stateName ? `, ${stateName}` : ''}</h2>
      <MetricCard label="Population" value={census.data?.demographics?.population ?? budget.data?.population ?? null} format="number" source="Census" />
      <MetricCard label="Median Income" value={census.data?.demographics?.medianIncome ?? null} format="dollar" source="Census" />
      <MetricCard label="Poverty Rate" value={census.data?.demographics?.povertyRate ?? null} format="percent" source="Census" />
      <MetricCard label="Bachelor's Degree %" value={census.data?.demographics?.bachelorsDegreeRate ?? null} format="percent" source="Census" />
      <MetricCard label="Median Home Value" value={census.data?.housing?.medianHomeValue ?? null} format="dollar" source="Census" />
      <MetricCard label="Median Rent" value={census.data?.housing?.medianRent ?? null} format="dollar" source="Census" />
      <MetricCard label="Total Budget" value={budget.data?.totalBudget ?? null} format="dollar" source="City Budget" />
      <MetricCard label="Per Capita Spending" value={budget.data?.perCapita ?? null} format="dollar" source="City Budget" />
      <MetricCard label="Public Transit %" value={census.data?.commuting?.publicTransitRate ?? null} format="percent" source="Census" />
      <MetricCard label="Work From Home %" value={census.data?.commuting?.workFromHomeRate ?? null} format="percent" source="Census" />
    </div>
  );
}

export function ComparePage() {
  const [city1, setCity1] = useState<string>('Denver');
  const [city2, setCity2] = useState<string>('Austin');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GitCompareArrows size={24} style={{ color: '#a5b4fc' }} />
        <h1 className="text-3xl font-bold" style={{ color: '#fff' }}>Compare Cities</h1>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>City 1</label>
          <CitySearch value={city1} onChange={setCity1} />
        </div>
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>City 2</label>
          <CitySearch value={city2} onChange={setCity2} />
        </div>
      </div>

      <div className="flex gap-6">
        <CityColumn city={city1} />
        <div className="w-px" style={{ background: 'var(--border-subtle)' }} />
        <CityColumn city={city2} />
      </div>
    </div>
  );
}
