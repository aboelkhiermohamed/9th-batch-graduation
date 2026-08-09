import { NextRequest, NextResponse } from 'next/server';
import { Product } from '@/types';
import { getMemoryProducts, setMemoryProducts, fetchProductsFromSupabase, saveProductToSupabase } from '@/lib/supabaseClient';

export async function GET() {
  const products = await fetchProductsFromSupabase();
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, title_ar, description, description_ar, price, category, image_url, images, size_chart_url, has_customization, customization_label, sizes, stock } = body;

    if (!title_ar || !price || !image_url) {
      return NextResponse.json(
        { error: 'Missing required product fields' },
        { status: 400 }
      );
    }

    const imgArray = Array.isArray(images) && images.length > 0 ? images : [image_url];

    const newProduct: Product = {
      id: 'prod-' + Date.now(),
      title: title || title_ar,
      title_ar: title_ar,
      description: description || '',
      description_ar: description_ar || '',
      price: Number(price),
      category: category || 'General',
      image_url: image_url,
      images: imgArray,
      size_chart_url: size_chart_url || undefined,
      has_customization: Boolean(has_customization),
      customization_label: customization_label || undefined,
      sizes: Array.isArray(sizes) ? sizes : [],
      stock: Number(stock || 100),
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const products = getMemoryProducts();
    setMemoryProducts([newProduct, ...products]);
    await saveProductToSupabase(newProduct);

    return NextResponse.json({ success: true, product: newProduct });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title_ar, price, stock, sizes, image_url, images, size_chart_url, has_customization, customization_label, is_active, category } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
    }

    const products = getMemoryProducts();
    const updated = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          title: title_ar || p.title,
          title_ar: title_ar || p.title_ar,
          price: price !== undefined ? Number(price) : p.price,
          stock: stock !== undefined ? Number(stock) : p.stock,
          sizes: Array.isArray(sizes) ? sizes : p.sizes,
          image_url: image_url || p.image_url,
          images: Array.isArray(images) && images.length > 0 ? images : p.images,
          size_chart_url: size_chart_url !== undefined ? size_chart_url : p.size_chart_url,
          has_customization: has_customization !== undefined ? Boolean(has_customization) : p.has_customization,
          customization_label: customization_label !== undefined ? customization_label : p.customization_label,
          category: category || p.category,
          is_active: is_active !== undefined ? is_active : p.is_active,
          updated_at: new Date().toISOString()
        };
      }
      return p;
    });

    setMemoryProducts(updated);
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
      return NextResponse.json({ error: 'Missing product ID' }, { status: 400 });
    }

    const products = getMemoryProducts();
    const filtered = products.filter(p => p.id !== id);
    setMemoryProducts(filtered);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
