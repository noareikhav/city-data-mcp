import { useCityData } from '../hooks/useCityData';
import { MetricCard } from '../components/cards/MetricCard';
import { CategoryBarChart } from '../components/charts/CategoryBarChart';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

interface SectionProps {
  city: string;
}

interface AirQualityData {
  city: string;
  current: Array<{
    parameter: string;
    aqi: number;
    category: { name: string; number: number };
  }>;
  forecast: Array<{
    parameter: string;
    aqi: number;
    category: { name: string; number: number };
  }>;
}

interface SchoolsData {
  city: string;
  districts: Array<{
    name: string;
    enrollment: number;
    teachers: number;
    pupilTeacherRatio: number;
    schools: number;
    revenue: {
      total: number;
      federal: number;
      state: number;
      local: number;
    };
    perPupilSpending: number;
  }>;
}

interface TransitData {
  city: string;
  agencies: Array<{
    name: string;
    modes: Array<{
      mode: string;
      ridership: number;
      vehicleHours: number;
      tripsPerHour: number;
    }>;
    totalRidership: number;
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

export function QualitySection({ city }: SectionProps) {
  const airQuality = useCityData<AirQualityData>('air-quality', city);
  const schools = useCityData<SchoolsData>('schools', city);
  const transit = useCityData<TransitData>('transit', city);

  const anyLoading = airQuality.loading || schools.loading || transit.loading;
  const noData = !airQuality.data && !schools.data && !transit.data;

  if (anyLoading) return <LoadingSpinner text="Loading quality of life data..." />;
  if (noData) return null;

  // Air quality: use first current reading
  const primaryAQ = airQuality.data?.current?.[0];

  // Schools: aggregate across districts
  const totalEnrollment = schools.data?.districts?.reduce((sum, d) => sum + (d.enrollment ?? 0), 0) ?? null;
  const avgPupilTeacherRatio = schools.data?.districts?.length
    ? schools.data.districts.reduce((sum, d) => sum + (d.pupilTeacherRatio ?? 0), 0) / schools.data.districts.length
    : null;
  const avgPerPupilSpending = schools.data?.districts?.length
    ? schools.data.districts.reduce((sum, d) => sum + (d.perPupilSpending ?? 0), 0) / schools.data.districts.length
    : null;

  // Transit: aggregate ridership by mode across all agencies
  const modeMap = new Map<string, number>();
  transit.data?.agencies?.forEach((agency) => {
    agency.modes?.forEach((m) => {
      modeMap.set(m.mode, (modeMap.get(m.mode) ?? 0) + (m.ridership ?? 0));
    });
  });
  const transitBarData = Array.from(modeMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Check if we have any displayable values
  const hasVisibleData =
    primaryAQ != null ||
    (totalEnrollment != null && totalEnrollment > 0) ||
    transitBarData.length > 0;

  if (!hasVisibleData) return null;

  return (
    <SectionWrapper title="Quality of Life">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {primaryAQ && (
          <>
            <MetricCard
              label={`Air Quality (${primaryAQ.parameter})`}
              value={primaryAQ.aqi}
              format="number"
              source="AirNow"
            />
            <MetricCard
              label="AQI Category"
              value={primaryAQ.category?.name ?? null}
              source="AirNow"
            />
          </>
        )}
        {totalEnrollment != null && totalEnrollment > 0 && (
          <MetricCard
            label="School Enrollment"
            value={totalEnrollment}
            format="number"
            source="NCES"
          />
        )}
        {avgPupilTeacherRatio != null && avgPupilTeacherRatio > 0 && (
          <MetricCard
            label="Student-Teacher Ratio"
            value={parseFloat(avgPupilTeacherRatio.toFixed(1))}
            format="rate"
            source="NCES"
          />
        )}
        {avgPerPupilSpending != null && avgPerPupilSpending > 0 && (
          <MetricCard
            label="Per-Pupil Spending"
            value={Math.round(avgPerPupilSpending)}
            format="dollar"
            source="NCES"
          />
        )}
      </div>

      {transitBarData.length > 0 && (
        <div className="mt-4">
          <CategoryBarChart
            data={transitBarData}
            title="Transit Ridership by Mode"
            color="#3b82f6"
          />
        </div>
      )}
    </SectionWrapper>
  );
}
