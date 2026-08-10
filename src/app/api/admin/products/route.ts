import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types';
import { getMemoryProducts, setMemoryProducts, fetchProductsFromSupabase, saveProductToSupabase, addDeletedProductId, fetchSettingsFromSupabase, saveSettingsToSupabase, supabase } from '@/lib/supabaseClient';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'f' + Date.now().toString(16).padStart(11, '0') + '-4000-8000-000000000000';
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const products = await fetchProductsFromSupabase();
  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate'
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, title_ar, description, description_ar, price, category, image_url, images, size_chart_url, has_customization, customization_label, sizes, stock, addons } = body;

    if (!title_ar || !price || !image_url) {
      return NextResponse.json(
        { error: 'جميع حقول المنتج الأساسية مطلوبة (الاسم بالعربي، السعر، وصورة المنتج)' },
        { status: 400 }
      );
    }

    const imgArray = Array.isArray(images) && images.length > 0 ? images : [image_url];
    const newId = generateUUID();

    const newProduct: Product = {
      id: newId,
      title: title || title_ar,
      title_ar: title_ar,
      description: description || '',
      description_ar: description_ar || '',
      price: Number(price),
      category: category || 'الملابس (Apparel)',
      image_url: image_url,
      images: imgArray,
      size_chart_url: size_chart_url || undefined,
      has_customization: Boolean(has_customization),
      customization_label: customization_label || undefined,
      sizes: Array.isArray(sizes) ? sizes : [],
      addons: Array.isArray(addons) ? addons : [],
      stock: Number(stock || 100),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await saveProductToSupabase(newProduct);
    if (!result.success) {
      return NextResponse.json(
        { error: 'فشل حفظ المنتج في قاعدة بيانات Supabase: ' + (result.error || '') },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'فشل إضافة المنتج' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title_ar, price, stock, sizes, image_url, images, size_chart_url, has_customization, customization_label, is_active, category, addons, description_ar } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف المنتج مطلوب' }, { status: 400 });
    }

    const products = getMemoryProducts();
    const updated = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          title: title_ar || p.title,
          title_ar: title_ar || p.title_ar,
          description_ar: description_ar !== undefined ? description_ar : p.description_ar,
          price: price !== undefined ? Number(price) : p.price,
          stock: stock !== undefined ? Number(stock) : p.stock,
          sizes: Array.isArray(sizes) ? sizes : p.sizes,
          image_url: image_url || p.image_url,
          images: Array.isArray(images) && images.length > 0 ? images : p.images,
          size_chart_url: size_chart_url !== undefined ? size_chart_url : p.size_chart_url,
          has_customization: has_customization !== undefined ? Boolean(has_customization) : p.has_customization,
          customization_label: customization_label !== undefined ? customization_label : p.customization_label,
          category: category || p.category,
          addons: addons !== undefined ? addons : p.addons,
          is_active: is_active !== undefined ? is_active : p.is_active,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });

    setMemoryProducts(updated);

    if (supabase) {
      try {
        await supabase
          .from('store_products')
          .update({
            title_ar,
            description_ar,
            price: Number(price),
            stock: Number(stock),
            sizes,
            image_url,
            images,
            size_chart_url,
            has_customization,
            customization_label,
            category,
            addons,
            is_active
          })
          .eq('id', id);
      } catch (e) {
        console.warn('Supabase product update warning:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'معرف المنتج مطلوب' }, { status: 400 });
    }

    addDeletedProductId(id);

    const products = getMemoryProducts();
    const filtered = products.filter(p => p.id !== id);
    setMemoryProducts(filtered);

    // Sync updated deleted product IDs list into DB store_settings metadata payload
    try {
      const currentSettings = await fetchSettingsFromSupabase();
      await saveSettingsToSupabase(currentSettings);
    } catch (e) {}

    if (supabase) {
      try {
        await supabase.from('store_products').delete().eq('id', id);
        await supabase.from('store_products').upsert({
          id: id,
          title: 'DELETED',
          title_ar: 'DELETED',
          price: 0,
          image_url: '',
          is_active: false
        });
      } catch (e) {
        console.warn('Supabase product delete warning:', e);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
