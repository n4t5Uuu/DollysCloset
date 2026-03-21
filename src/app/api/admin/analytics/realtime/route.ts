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

    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'eventCount' },
      ],
    });

    const row = response.rows?.[0];
    return NextResponse.json({
      activeUsers: Number(row?.metricValues?.[0]?.value ?? 0),
      totalViews:  Number(row?.metricValues?.[1]?.value ?? 0),
      totalEvents: Number(row?.metricValues?.[2]?.value ?? 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('GA4 Realtime error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
