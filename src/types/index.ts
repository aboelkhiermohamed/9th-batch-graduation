// Types definition for 9th Batch Graduation Store

export type PaymentMethod = 'vodafone_cash' | 'instapay';

export type OrderStatus =
  | 'pending'
  | 'auto_verified'
  | 'manual_verified'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

// Add-on option that can be attached to a product (e.g. "تطريز اسم: +50 ج.م")
export interface ProductAddon {
  id: string;
  name: string;   // e.g. "تطريز اسم الطالب"
  price: number;  // Extra price added on top of base product price
}

export interface Product {
  id: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  price: number;
  category: string;
  image_url: string;
  images?: string[];
  size_chart_url?: string;
  has_customization?: boolean;
  customization_label?: string;
  sizes: string[];
  addons?: ProductAddon[]; // Optional add-ons with extra prices
  stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_title: string;
  selected_size?: string;
  quantity: number;
  unit_price: number;
  custom_text?: string;
  customization_option?: string;
  selected_addons?: ProductAddon[]; // Selected add-ons for this item
  product?: Product;
}

export interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  status: OrderStatus;
  total_amount: number;
  sender_phone?: string;
  transaction_ref?: string;
  receipt_url?: string;
  notes?: string;
  matched_transaction_id?: string;
  verified_at?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface StoreSettings {
  id: string;
  store_name: string;
  vodafone_cash_numbers: string[];
  instapay_ipa: string;
  pickup_note: string;
  updated_at: string;
}

export interface IncomingTransaction {
  id: string;
  payment_method: PaymentMethod;
  amount: number;
  sender_phone?: string;
  sender_name?: string;
  transaction_ref?: string;
  matched_order_id?: string;
  status: 'unmatched' | 'matched' | 'manual_matched';
  raw_sms: string;
  received_at: string;
  created_at: string;
}

export interface GatewayDevice {
  id: string;
  device_name: string;
  phone_number?: string;
  battery_level?: number;
  status: 'online' | 'offline';
  last_ping: string;
  total_sms_processed: number;
  app_version?: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  selectedSize?: string;
  customText?: string;
  customizationOption?: string;
  quantity: number;
  selectedAddons?: ProductAddon[];
}

export interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  role: 'superadmin' | 'admin';
  is_active: boolean;
  password?: string;
  created_at: string;
}

export interface CustomerUser {
  id?: string;
  phone_number: string;
  email?: string;
  full_name: string;
  created_at?: string;
}
