import { NextRequest, NextResponse } from 'next/server';
import { getDeliveryAnalyticsSummary } from '@/lib/deliveryZonesService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/admin/zones/stats - Returns comprehensive delivery metrics, zone breakdown, and item counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get('refresh') === 'true';
    const stats = await getDeliveryAnalyticsSummary(forceRefresh);
    return NextResponse.json(
      {
        success: true,
        stats
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (err: any) {
    console.error('Error fetching delivery statistics:', err);
    return NextResponse.json(
      { success: false, error: 'فشل تحميل إحصائيات وتقارير التسليم' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

