// Types definition for 9th Batch Graduation Store

export type PaymentMethod = 'vodafone_cash' | 'instapay';

export type OrderStatus =
  | 'pending'
  | 'pending_difference'
  | 'auto_verified'
  | 'manual_verified'
  | 'ready_for_pickup'
  | 'delivered'
  | 'cancelled';

// Event Attendee Details for Event Booking Tickets
export interface EventAttendee {
  name: string;
  phone?: string;
  notes?: string;
}

// Add-on option that can be attached to a product (e.g. "تطريز اسم: +50 ج.م")
export interface ProductAddon {
  id: string;
  name: string;   // e.g. "تطريز اسم الطالب"
  price: number;  // Extra price added on top of base product price
  image_url?: string; // Image URL for the add-on
  description?: string; // Optional description
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
  is_event?: boolean; // Flag to indicate if product is an Event Ticket / Booking
  event_date?: string; // Optional Event Date (e.g. "2026-09-25")
  event_location?: string; // Optional Event Venue / Location
  max_tickets_per_order?: number; // Optional limit for tickets per order
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
  image_url?: string;
  selected_size?: string;
  quantity: number;
  unit_price: number;
  custom_text?: string;
  customization_option?: string;
  selected_addons?: ProductAddon[]; // Selected add-ons for this item
  attendees?: EventAttendee[]; // List of attendee details corresponding to ticket quantity
  product?: Product;
}

export interface OrderEditRecord {
  date: string;
  note: string;
  admin: string;
  price_diff: number;
}

export interface Order {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  payment_method: PaymentMethod;
  status: OrderStatus;
  total_amount: number;
  paid_amount?: number;
  difference_amount?: number;
  is_difference_pending?: boolean;
  edit_history?: OrderEditRecord[];
  sender_phone?: string;
  transaction_ref?: string;
  receipt_url?: string;
  notes?: string;
  matched_transaction_id?: string;
  confirmed_line?: string; // e.g. "خط 1 - المحفظة الرئيسية (01015339426)"
  matched_device_name?: string;
  matched_device_id?: string;
  verified_at?: string;
  verified_by?: string;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface StoreSettings {
  id: string;
  store_name: string;
  vodafone_cash_enabled?: boolean;
  instapay_enabled?: boolean;
  vodafone_cash_fee_percent?: number;
  vodafone_cash_numbers: string[];
  line_labels?: Record<string, string>; // Maps phone numbers or index to custom line titles e.g. {"01015339426": "خط 1 - المحفظة الرئيسية"}
  instapay_ipa: string;
  instapay_ipas?: string[];
  pickup_note: string;
  support_phone?: string;
  maintenance_mode?: boolean;
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
  recipient_phone?: string; // Receiving wallet line phone number
  device_id?: string;       // Android Gateway device ID
  device_name?: string;     // Friendly name of the Android Gateway
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
  attendees?: EventAttendee[];
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
