import { NextRequest, NextResponse } from 'next/server';
import { searchOrderForZone } from '@/lib/deliveryZonesService';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Highly optimized single-order search for Delivery Zones (minimal payload)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('code') || searchParams.get('id');

    if (!query || !query.trim()) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال رقم أو كود الطلب للبحث' },
        {
          status: 400,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    const order = await searchOrderForZone(query);

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'لم يتم العثور على أي طلب يطابق هذا الكود أو الرقم' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        order
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
    console.error('Error searching order for zone:', err);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء البحث عن الطلب' },
      { status: 500 }
    );
  }
}
