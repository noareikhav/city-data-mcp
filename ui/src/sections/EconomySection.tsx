import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { TrendLineChart } from '../components/charts/TrendLineChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SectionProps {
  city: string;
}

interface BLSData {
  city: string;
  unemployment: {
    current: number;
    currentDate: string;
    yearAgo: number;
    yearAgoDate: string;
    change: number;
    monthly: Array<{ date: string; value: number }>;
  };
  employment: {
    current: number;
    currentDate: string;
    yearAgo: number;
    change: number;
    changePercent: number;
  };
  laborForce: {
    current: number;
    currentDate: string;
  };
}

interface FREDData {
  city: string;
  series: Array<{
    id: string;
    label: string;
    latestValue: number;
    latestDate: string;
    previousValue: number;
    change: number;
    unit: string;
  }>;
}

function SectionWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );
}

export function EconomySection({ city }: SectionProps) {
  const bls = useCityData<BLSData>('employment', city);
  const fred = useCityData<FREDData>('economics', city);

  const anyLoading = bls.loading || fred.loading;
  const noData = !bls.data && !fred.data;

  if (anyLoading) return <LoadingSpinner text="Loading economy data..." />;
  if (noData) return null;

  // Map monthly unemployment data for trend chart (API returns 'rate' not 'value')
  const unemploymentTrend = (bls.data?.unemployment?.monthly?.map((m: any) => ({
    label: m.date,
    value: m.rate ?? m.value,
  })) ?? []).reverse(); // Reverse so oldest is first (left-to-right)

  // Find specific FRED series
  const housingIndex = fred.data?.series?.find(
    (s) => s.label.toLowerCase().includes('housing') || s.label.toLowerCase().includes('home price')
  );
  const personalIncome = fred.data?.series?.find(
    (s) => s.label.toLowerCase().includes('personal income') || s.label.toLowerCase().includes('per capita')
  );

  return (
    <SectionWrapper title="Economy & Employment">

      {unemploymentTrend.length > 0 && (
        <div className="mb-4">
          <TrendLineChart
            data={unemploymentTrend}
            yLabel="Unemployment Rate (%)"
            color="#ef4444"
            name="Rate"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Unemployment Rate"
          value={bls.data?.unemployment?.current ?? null}
          format="rate"
          source="BLS"
          trend={
            bls.data?.unemployment?.change != null
              ? {
                  direction: bls.data.unemployment.change < 0 ? 'down' : bls.data.unemployment.change > 0 ? 'up' : 'stable',
                  text: `${bls.data.unemployment.change > 0 ? '+' : ''}${bls.data.unemployment.change.toFixed(1)}% vs year ago`,
                }
              : undefined
          }
        />
        <MetricCard
          label="Total Employment"
          value={bls.data?.employment?.current ?? null}
          format="number"
          source="BLS"
          trend={
            bls.data?.employment?.changePercent != null
              ? {
                  direction: bls.data.employment.changePercent > 0 ? 'up' : bls.data.employment.changePercent < 0 ? 'down' : 'stable',
                  text: `${bls.data.employment.changePercent > 0 ? '+' : ''}${bls.data.employment.changePercent.toFixed(1)}% YoY`,
                }
              : undefined
          }
        />
        <MetricCard
          label="Job Growth"
          value={bls.data?.employment?.change ?? null}
          format="number"
          source="BLS"
          trend={
            bls.data?.employment?.change != null
              ? {
                  direction: bls.data.employment.change > 0 ? 'up' : bls.data.employment.change < 0 ? 'down' : 'stable',
                  text: `${bls.data.employment.change > 0 ? '+' : ''}${bls.data.employment.change.toLocaleString()} jobs vs year ago`,
                }
              : undefined
          }
        />
        {housingIndex && (
          <MetricCard
            label={housingIndex.label}
            value={housingIndex.latestValue}
            format="rate"
            source="FRED"
            trend={
              housingIndex.change != null
                ? {
                    direction: housingIndex.change > 0 ? 'up' : housingIndex.change < 0 ? 'down' : 'stable',
                    text: `${housingIndex.change > 0 ? '+' : ''}${housingIndex.change.toFixed(1)} ${housingIndex.unit}`,
                  }
                : undefined
            }
          />
        )}
        {personalIncome && (
          <MetricCard
            label={personalIncome.label}
            value={personalIncome.latestValue}
            format={personalIncome.unit === 'Dollars' ? 'dollar' : 'number'}
            source="FRED"
            trend={
              personalIncome.change != null
                ? {
                    direction: personalIncome.change > 0 ? 'up' : personalIncome.change < 0 ? 'down' : 'stable',
                    text: `${personalIncome.change > 0 ? '+' : ''}${personalIncome.change.toFixed(1)} ${personalIncome.unit}`,
                  }
                : undefined
            }
          />
        )}
        <MetricCard
          label="Labor Force"
          value={bls.data?.laborForce?.current ?? null}
          format="number"
          source="BLS"
        />
      </div>
    </SectionWrapper>
  );
}
