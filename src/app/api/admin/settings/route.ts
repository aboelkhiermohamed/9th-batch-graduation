import { NextRequest, NextResponse } from 'next/server';
import { getMemorySettings, setMemorySettings, fetchSettingsFromSupabase, saveSettingsToSupabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const settings = await fetchSettingsFromSupabase();
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      vodafone_cash_enabled, 
      instapay_enabled, 
      vodafone_cash_fee_percent,
      maintenance_mode,
      vodafone_cash_numbers, 
      line_labels,
      instapay_ipa, 
      instapay_ipas, 
      pickup_note, 
      support_phone,
      store_name 
    } = body;

    const current = await fetchSettingsFromSupabase();

    const updated = {
      ...current,
      store_name: store_name || current.store_name,
      vodafone_cash_enabled: vodafone_cash_enabled !== undefined ? Boolean(vodafone_cash_enabled) : Boolean(current.vodafone_cash_enabled),
      instapay_enabled: instapay_enabled !== undefined ? Boolean(instapay_enabled) : Boolean(current.instapay_enabled),
      vodafone_cash_fee_percent: vodafone_cash_fee_percent !== undefined ? Number(vodafone_cash_fee_percent) : (current.vodafone_cash_fee_percent ?? 1),
      maintenance_mode: maintenance_mode !== undefined ? Boolean(maintenance_mode) : Boolean(current.maintenance_mode),
      vodafone_cash_numbers: Array.isArray(vodafone_cash_numbers) 
        ? vodafone_cash_numbers 
        : current.vodafone_cash_numbers,
      line_labels: line_labels || current.line_labels || {},
      instapay_ipa: instapay_ipa || (Array.isArray(instapay_ipas) && instapay_ipas[0]) || current.instapay_ipa,
      instapay_ipas: Array.isArray(instapay_ipas)
        ? instapay_ipas
        : (instapay_ipa ? [instapay_ipa] : current.instapay_ipas || [current.instapay_ipa]),
      pickup_note: pickup_note !== undefined ? pickup_note : current.pickup_note,
      support_phone: support_phone !== undefined ? support_phone : (current.support_phone || '01555583154'),
      updated_at: new Date().toISOString()
    };

    setMemorySettings(updated);
    await saveSettingsToSupabase(updated);

    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
