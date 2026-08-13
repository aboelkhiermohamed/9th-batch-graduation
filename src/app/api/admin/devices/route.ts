import { NextRequest, NextResponse } from 'next/server';
import { fetchDevicesFromSupabase, upsertDevicePingInSupabase, deleteDeviceInSupabase, clearDevicesInSupabase, updateDeviceDetailsInSupabase } from '@/lib/supabaseClient';

export async function GET() {
  try {
    const devices = await fetchDevicesFromSupabase();
    return NextResponse.json(devices);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key') || req.nextUrl.searchParams.get('api_key');
    const expectedKey = process.env.SMS_GATEWAY_API_KEY || 'graduation-store-secure-gateway-token-2026';

    if (apiKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const devId = body.deviceId || body.device_id || 'dev-android';
    const battery = body.battery !== undefined ? Number(body.battery) : (body.battery_level !== undefined ? Number(body.battery_level) : 100);
    const phone = body.phone_number || body.phone || undefined;
    const name = body.device_name || body.deviceName || `Android Phone (${devId.slice(0, 8)})`;
    const appVersion = body.app_version || body.appVersion || 'v2.5.0-android';

    const device = await upsertDevicePingInSupabase({
      id: devId,
      device_name: name,
      phone_number: phone,
      battery_level: battery,
      app_version: appVersion
    });

    return NextResponse.json({
      success: true,
      device,
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, device_name, phone_number } = body;

    if (!id || !device_name) {
      return NextResponse.json({ error: 'Missing id or device_name' }, { status: 400 });
    }

    const device = await updateDeviceDetailsInSupabase(id, {
      device_name: device_name.trim(),
      phone_number: phone_number?.trim()
    });

    return NextResponse.json({ success: true, device });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      await deleteDeviceInSupabase(id);
    } else {
      await clearDevicesInSupabase();
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

