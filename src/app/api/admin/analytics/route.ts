import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';

function getAnalyticsClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
}

export async function GET() {
  const propertyId = process.env.GA4_PROPERTY_ID;

  if (!propertyId || !process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Analytics not configured' }, { status: 503 });
  }

  try {
    const client = getAnalyticsClient();
    const property = `properties/${propertyId}`;

    const [dailyResponse, pagesResponse, totalsResponse, deviceResponse] = await Promise.all([
      // Daily breakdown for last 30 days
      client.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'sessions' },
          { name: 'screenPageViews' },
        ],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),

      // Top pages by views
      client.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),

      // 30-day totals
      client.runReport({
        property,
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
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
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [{ name: 'activeUsers' }],
        orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      }),
    ]);

    const dailyData = dailyResponse[0].rows?.map(row => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      users: Number(row.metricValues?.[0]?.value ?? 0),
      sessions: Number(row.metricValues?.[1]?.value ?? 0),
      pageViews: Number(row.metricValues?.[2]?.value ?? 0),
    })) ?? [];

    const topPages = pagesResponse[0].rows?.map(row => ({
      page: row.dimensionValues?.[0]?.value ?? '',
      views: Number(row.metricValues?.[0]?.value ?? 0),
      users: Number(row.metricValues?.[1]?.value ?? 0),
    })) ?? [];

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

    return NextResponse.json({ dailyData, topPages, totals, deviceData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('GA4 Analytics error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
