import { Order } from '@poc/shared-types';

interface Props {
  orders: Order[];
}

export function OrderList({ orders }: Props) {
  if (orders.length === 0) return <p>No orders yet.</p>;

  return (
    <div>
      <h2>Orders</h2>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['ID', 'Customer', 'Total', 'Status', 'Created'].map(h => (
              <th key={h} style={{ textAlign: 'left', borderBottom: '1px solid #ccc', padding: '4px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id}>
              <td style={{ padding: '4px 8px', fontFamily: 'monospace', fontSize: '0.8em' }}>{o.id}</td>
              <td style={{ padding: '4px 8px' }}>{o.customerId}</td>
              <td style={{ padding: '4px 8px' }}>${o.totalAmount.toFixed(2)}</td>
              <td style={{ padding: '4px 8px' }}>{o.status}</td>
              <td style={{ padding: '4px 8px' }}>{new Date(o.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
