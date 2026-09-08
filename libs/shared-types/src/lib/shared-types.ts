export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderDto {
  customerId: string;
  items: Omit<OrderItem, never>[];
}

export interface OrderCreatedEvent {
  orderId: string;
  customerId: string;
  items: OrderItem[];
  totalAmount: number;
  timestamp: string;
}
