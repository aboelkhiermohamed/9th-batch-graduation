import { NextRequest, NextResponse } from 'next/server';
import { getMemorySettings, setMemorySettings, fetchSettingsFromSupabase, saveSettingsToSupabase } from '@/lib/supabaseClient';

export async function GET() {
  const settings = await fetchSettingsFromSupabase();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { vodafone_cash_numbers, instapay_ipa, pickup_note, store_name } = body;

    const current = await fetchSettingsFromSupabase();

    const updated = {
      ...current,
      store_name: store_name || current.store_name,
      vodafone_cash_numbers: Array.isArray(vodafone_cash_numbers) 
        ? vodafone_cash_numbers 
        : current.vodafone_cash_numbers,
      instapay_ipa: instapay_ipa || current.instapay_ipa,
      pickup_note: pickup_note || current.pickup_note,
      updated_at: new Date().toISOString()
    };

    setMemorySettings(updated);
    await saveSettingsToSupabase(updated);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
