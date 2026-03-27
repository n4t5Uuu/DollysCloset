import { AnalyticsTabs } from '@/components/analytics/AnalyticsTabs';
import { RealtimeSection } from '@/components/analytics/RealtimeSection';
import { getServerAuthState } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { buildLoginPath, buildUnauthorizedPath } from "@/lib/auth-routing";

export default async function AnalyticsPage() {
  const authState = await getServerAuthState();
  
  if (!authState.ok) redirect(buildLoginPath({ reason: authState.reason }));
  if (authState.role !== 'admin') redirect(buildUnauthorizedPath("access-denied"));

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-gray-500 text-sm">Website traffic and visitor metrics.</p>
        </div>
        <RealtimeSection />
      </div>
      <AnalyticsTabs />
    </div>
  );
}
