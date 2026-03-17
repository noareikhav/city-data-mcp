import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { DonutChart } from '../components/charts/DonutChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorCard } from '../components/common/ErrorCard';

interface SectionProps {
  city: string;
}

interface BudgetData {
  city: string;
  totalBudget: number;
  population: number;
  perCapita: number;
  fiscalYear: string;
  categories: Array<{ name: string; amount: number; share: number }>;
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function GovernmentSection({ city }: SectionProps) {
  const { data, loading, error } = useCityData<BudgetData>('budget', city);

  if (loading) return <LoadingSpinner text="Loading government data..." />;
  if (!data && !error) return null;
  if (error) return <SectionWrapper title="Government & Budget"><ErrorCard message={error} /></SectionWrapper>;

  // Map categories for donut chart
  const donutData = data!.categories?.map((c) => ({
    name: c.name,
    value: c.amount,
  })) ?? [];

  return (
    <SectionWrapper title="Government & Budget">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Total Budget"
          value={data!.totalBudget}
          format="dollar"
          source="City Budget"
        />
        <MetricCard
          label="Per Capita Spending"
          value={data!.perCapita}
          format="dollar"
          source="City Budget"
        />
        <MetricCard
          label="Fiscal Year"
          value={data!.fiscalYear}
          source="City Budget"
        />
      </div>

      {donutData.length > 0 && (
        <div className="mt-4">
          <DonutChart data={donutData} title="Budget Breakdown by Category" />
        </div>
      )}
    </SectionWrapper>
  );
}
