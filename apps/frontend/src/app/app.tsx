import { useState } from 'react';
import { Order } from '@poc/shared-types';
import { CreateOrderForm } from './CreateOrderForm';
import { OrderList } from './OrderList';

export function App() {
  const [orders, setOrders] = useState<Order[]>([]);

  const handleOrderCreated = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  return (
    <main style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Order Management</h1>
      <CreateOrderForm onCreated={handleOrderCreated} />
      <OrderList orders={orders} />
    </main>
  );
}

export default App;
