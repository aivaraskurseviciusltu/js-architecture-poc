import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import type { Order } from '@poc/shared-types';
import { createOrder } from '../../shared/api';

interface Item {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface Props {
  onCreated: (order: Order) => void;
}

const emptyItem = (): Item => ({ productId: '', name: '', quantity: 1, unitPrice: 0 });

export function CreateOrderForm({ onCreated }: Props) {
  const [customerId, setCustomerId] = useState('');
  const [items, setItems]           = useState<Item[]>([emptyItem()]);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const updateItem = (index: number, field: keyof Item, value: string | number) =>
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));

  const addItem    = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const order = await createOrder({ customerId, items });
      onCreated(order);
      setCustomerId('');
      setItems([emptyItem()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<ShoppingCartIcon color="primary" />}
        title={<Typography variant="h6" fontWeight={600}>New Order</Typography>}
        subheader="Fill in customer and item details"
      />
      <Divider />
      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Customer ID"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            required fullWidth placeholder="customer-123"
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
            Items
          </Typography>

          {items.map((item, i) => (
            <Box key={i} sx={{ mb: 2 }}>
              <Grid container spacing={1.5} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField label="Product ID" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)} required fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField label="Name" value={item.name} onChange={e => updateItem(i, 'name', e.target.value)} required fullWidth size="small" />
                </Grid>
                <Grid item xs={6} sm={2}>
                  <TextField label="Qty" type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} inputProps={{ min: 1 }} required fullWidth size="small" />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField label="Unit Price ($)" type="number" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))} inputProps={{ min: 0, step: '0.01' }} required fullWidth size="small" />
                </Grid>
                <Grid item xs={12} sm={1} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Tooltip title="Remove item">
                    <span>
                      <IconButton color="error" size="small" onClick={() => removeItem(i)} disabled={items.length === 1}>
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
            </Box>
          ))}

          <Button startIcon={<AddCircleIcon />} onClick={addItem} size="small" sx={{ mb: 2 }}>
            Add Item
          </Button>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body1">
              Subtotal:{' '}
              <Typography component="span" fontWeight={700} color="primary">
                ${subtotal.toFixed(2)}
              </Typography>
            </Typography>
            <Button type="submit" variant="contained" size="large" disabled={loading || !customerId} sx={{ minWidth: 140 }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Place Order'}
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
