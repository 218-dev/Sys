export interface Product {
  id: string;
  name: string;
  category: string;
  face_value: number;
  currency: string;
  cost: number;
  image: string;
  description: string;
}

export interface Order {
  id: string;
  product_id: string;
  product_name: string;
  quantity_requested: number;
  quantity_purchased: number;
  status: 'active' | 'stopped' | 'completed';
  created_at: string;
}

export interface Purchase {
  id: number;
  order_id: string;
  product_id: string;
  serial_code: string;
  serial_number: string;
  decrypted_code: string;
  status: 'success' | 'failed';
  created_at: string;
}

export interface Stats {
  total_orders: number;
  active_orders: number;
  completed_orders: number;
  total_purchases: number;
  total_items_purchased: number;
  total_cost_usd: number;
  monitoring_active: boolean;
  products_count: number;
  port: number;
}

export interface Balance {
  balance: number;
  currency: string;
  message: string;
}
