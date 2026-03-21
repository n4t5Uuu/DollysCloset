import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';
import { RealtimeSection } from '@/components/analytics/RealtimeSection';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analytics</h1>
          <p className="text-gray-500 text-sm">Website traffic and visitor metrics.</p>
        </div>
        <RealtimeSection />
      </div>
      <AnalyticsTabs />
    </div>
  );
}
