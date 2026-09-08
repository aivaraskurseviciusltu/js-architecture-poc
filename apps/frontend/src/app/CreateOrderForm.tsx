import React, { useState } from 'react';
import { Order } from '@poc/shared-types';
import { createOrder } from './api';

interface Item {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  onCreated: (order: Order) => void;
}

export function CreateOrderForm({ onCreated }: Props) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<Item[]>([
    { productId: '', name: '', quantity: 1, unitPrice: 0 },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const addItem = () =>
    setItems(prev => [...prev, { productId: '', name: '', quantity: 1, unitPrice: 0 }]);

  const removeItem = (index: number) =>
    setItems(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({ customerId, items });
      onCreated(order);
      setCustomerId('');
      setItems([{ productId: '', name: '', quantity: 1, unitPrice: 0 }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: '2rem' }}>
      <h2>Create Order</h2>
      <div style={{ marginBottom: '0.5rem' }}>
        <label>
          Customer ID:{' '}
          <input
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            required
            placeholder="customer-123"
          />
        </label>
      </div>
      <h3>Items</h3>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          <input placeholder="Product ID" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required />
          <input placeholder="Name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} required />
          <input type="number" placeholder="Qty" value={item.quantity} min={1} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} required style={{ width: '60px' }} />
          <input type="number" placeholder="Unit Price" value={item.unitPrice} min={0} step="0.01" onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} required style={{ width: '100px' }} />
          {items.length > 1 && <button type="button" onClick={() => removeItem(i)}>✕</button>}
        </div>
      ))}
      <button type="button" onClick={addItem} style={{ marginRight: '0.5rem' }}>+ Add Item</button>
      <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Order'}</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </form>
  );
}
