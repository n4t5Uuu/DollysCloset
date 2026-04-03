import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { NextResponse } from 'next/server';
import { requireRequestAuth } from '@/lib/auth/auth-server';

function getAnalyticsClient() {
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: process.env.GA4_CLIENT_EMAIL,
      private_key: process.env.GA4_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
  });
}

function normalizeAnalyticsError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (lower.includes('bad gateway') || lower.includes('502')) {
    return {
      error: 'Live analytics are temporarily unavailable. Please try again shortly.',
      status: 502,
    };
  }

  if (lower.includes('permission') || lower.includes('403')) {
    return {
      error: 'The live analytics report could not be accessed with the current credentials.',
      status: 502,
    };
  }

  return {
    error: message,
    status: 500,
  };
}

export async function GET(request: Request) {
  const authResult = await requireRequestAuth(request, {
    allowCookieAuth: true,
    allowedRoles: ["admin"],
  });

  if (!authResult.ok) {
    return authResult.response;
  }

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
    const normalized = normalizeAnalyticsError(err);
    console.error('GA4 Realtime error:', normalized.error);
    return NextResponse.json({ error: normalized.error }, { status: normalized.status });
  }
}
