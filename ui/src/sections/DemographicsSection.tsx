import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { DonutChart } from '../components/charts/DonutChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';

interface SectionProps {
  city: string;
}

interface CensusData {
  city: string;
  state: string;
  demographics: {
    population: number;
    medianAge: number;
    medianIncome: number;
    perCapitaIncome: number;
    povertyRate: number;
    bachelorsDegreeRate: number;
  };
  commuting: {
    driveAloneRate: number;
    publicTransitRate: number;
    workFromHomeRate: number;
    meanTravelTime: number;
  };
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function DemographicsSection({ city }: SectionProps) {
  const { data, loading, error } = useCityData<CensusData>('census', city);

  if (loading) return <LoadingSpinner text="Loading demographics..." />;
  if (!data && !error) return null;
  // Hide section entirely if data unavailable (page-level banner handles key notice)
  if (!data && error) return null;

  const demo = data!.demographics;
  const commute = data!.commuting;

  // Build commute mode donut data
  const driveAlone = commute?.driveAloneRate ?? 0;
  const transit = commute?.publicTransitRate ?? 0;
  const wfh = commute?.workFromHomeRate ?? 0;
  const other = Math.max(0, 100 - driveAlone - transit - wfh);

  const commuteData = [
    { name: 'Drive Alone', value: driveAlone },
    { name: 'Public Transit', value: transit },
    { name: 'Work From Home', value: wfh },
    { name: 'Other', value: parseFloat(other.toFixed(1)) },
  ].filter((d) => d.value > 0);

  return (
    <SectionWrapper title="Demographics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Population"
          value={demo?.population ?? null}
          format="number"
          source="Census"
        />
        <MetricCard
          label="Median Age"
          value={demo?.medianAge ?? null}
          format="rate"
          source="Census"
        />
        <MetricCard
          label="Median Household Income"
          value={demo?.medianIncome ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Per Capita Income"
          value={demo?.perCapitaIncome ?? null}
          format="dollar"
          source="Census"
        />
        <MetricCard
          label="Poverty Rate"
          value={demo?.povertyRate ?? null}
          format="percent"
          source="Census"
        />
        <MetricCard
          label="Bachelor's Degree Rate"
          value={demo?.bachelorsDegreeRate ?? null}
          format="percent"
          source="Census"
        />
      </div>
      {commuteData.length > 0 && (
        <div className="mt-4">
          <DonutChart data={commuteData} title="Commute Mode Share" />
        </div>
      )}
    </SectionWrapper>
  );
}
