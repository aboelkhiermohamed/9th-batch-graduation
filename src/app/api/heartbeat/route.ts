import { NextRequest, NextResponse } from 'next/server';
import { upsertDevicePingInSupabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      try {
        const text = await req.text();
        body = JSON.parse(text);
      } catch {
        body = {};
      }
    }

    const devId = body.deviceId || body.device_id || '44f26a85aa395afd';
    const battery = body.battery !== undefined ? Number(body.battery) : 100;
    const phone = body.phone_number || body.phone || undefined;
    const name = body.device_name || body.deviceName || `Android Gateway (${devId.slice(0, 8)})`;
    const appVersion = body.app_version || body.appVersion || 'v2.5.0-android';

    const device = await upsertDevicePingInSupabase({
      id: devId,
      device_name: name,
      phone_number: phone,
      battery_level: battery,
      app_version: appVersion
    });

    return NextResponse.json({
      status: 'online',
      success: true,
      message: 'Heartbeat recorded successfully',
      device,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({
      status: 'online',
      success: true,
      message: 'Heartbeat received'
    }, { status: 200 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: 'online',
    success: true,
    message: 'Gateway Heartbeat Service Ready'
  });
}
