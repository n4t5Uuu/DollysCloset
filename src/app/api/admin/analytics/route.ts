import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextRequest, NextResponse } from 'next/server';

function getAnalyticsClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
}

export async function GET(request: NextRequest) {
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId || !process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month'); // Expects "YYYY-MM"

  let startDate = '30daysAgo';
  let endDate = 'today';

  if (monthParam) {
    const [year, month] = monthParam.split('-');
    startDate = `${year}-${month}-01`;
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  }

  try {
    const client = getAnalyticsClient();
    const property = `properties/${propertyId}`;

    const [dailyResponse, pagesResponse, totalsResponse, deviceResponse, monthlyResponse] = await Promise.all([
      // Daily breakdown for selected period
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),

      // Top pages by views (fetch more to ensure enough after splitting)
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 30,
      }),

      // Period totals
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
          { name: 'newUsers' },
        ],
      }),

      // Device category breakdown
      client.runReport({
        property,
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),

      // Monthly breakdown for last 12 months
      client.runReport({
        property,
        dateRanges: [{ startDate: '365daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'yearMonth' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'yearMonth' } }],
      }),
    ]);

    const dailyData = dailyResponse[0].rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      pageViews: Number(row.metricValues?.[2]?.value ?? 0),
    })) ?? [];

    const INTERNAL_PREFIXES = ['/admin', '/employee', '/dashboard', '/unauthorized', '/forbidden'];
    const isInternal = (path: string) => INTERNAL_PREFIXES.some(p => path.startsWith(p));

    const allPages = pagesResponse[0].rows?.map(row => ({
      page: row.dimensionValues?.[0]?.value ?? '',
      views: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? [];

    const customerPages = allPages.filter(p => !isInternal(p.page)).slice(0, 10);
    const internalPages = allPages.filter(p => isInternal(p.page)).slice(0, 10);

    const totalsRow = totalsResponse[0].rows?.[0];
    const totals = {
      activeUsers: Number(totalsRow?.metricValues?.[0]?.value ?? 0),
      sessions: Number(totalsRow?.metricValues?.[1]?.value ?? 0),
      pageViews: Number(totalsRow?.metricValues?.[2]?.value ?? 0),
      newUsers: Number(totalsRow?.metricValues?.[3]?.value ?? 0),
    };

    const deviceData = deviceResponse[0].rows?.map(row => ({
      device: row.dimensionValues?.[0]?.value ?? '',
      users: Number(row.metricValues?.[0]?.value ?? 0),
    })) ?? [];

    const monthlyData = monthlyResponse[0].rows?.map(row => {
      const ym = row.dimensionValues?.[0]?.value ?? '';
      const month = new Date(`${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`)
        .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      return {
        month,
        value: `${ym.slice(0, 4)}-${ym.slice(4, 6)}`, // "2026-02"
        users: Number(row.metricValues?.[0]?.value ?? 0),
        sessions: Number(row.metricValues?.[1]?.value ?? 0),
        pageViews: Number(row.metricValues?.[2]?.value ?? 0),
      };
    }) ?? [];

    return NextResponse.json({ dailyData, monthlyData, customerPages, internalPages, totals, deviceData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('GA4 Analytics error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
