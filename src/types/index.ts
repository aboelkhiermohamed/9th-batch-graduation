// Types definition for 9th Batch Graduation Store

export type PaymentMethod = 'vodafone_cash' | 'instapay';

export type OrderStatus = 
  | 'pending'           // Waiting for payment transfer SMS
  | 'auto_verified'     // System matched payment via SMS automatically
  | 'manual_verified'   // Admin manually approved payment
  | 'ready_for_pickup'  // Package packed & ready at pickup venue ("تابع جروب التليجرام")
  | 'delivered'         // Handed over to customer
  | 'cancelled';        // Cancelled or invalid

export interface Product {
  id: string;
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  price: number;
  category: string;
  image_url: string;
  images?: string[]; // Multiple product gallery images
  size_chart_url?: string; // Optional Size Chart Image URL
  has_customization?: boolean; // Enable custom text/embroidery input
  customization_label?: string; // e.g., "الاسم أو الكلية على الجاكيت"
  sizes: string[]; // e.g. ["S", "M", "L", "XL", "XXL"]
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
  custom_text?: string; // Custom embroidery/printed name typed by customer
  customization_option?: string; // Custom option chosen
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
  receipt_url?: string; // Screenshot / receipt uploaded by customer
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
}

