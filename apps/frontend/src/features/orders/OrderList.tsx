import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { Order } from '@poc/shared-types';

interface Props {
  orders: Order[];
  loading?: boolean;
  onRefresh?: () => void;
}

const STATUS_COLOR: Record<string, 'default' | 'warning' | 'success' | 'error'> = {
  pending:   'warning',
  confirmed: 'success',
  cancelled: 'error',
};

export function OrderList({ orders, loading = false, onRefresh }: Props) {
  return (
    <Card variant="outlined" sx={{ mt: 3 }}>
      <CardHeader
        avatar={<ReceiptLongIcon color="primary" />}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight={600}>Orders</Typography>
            <Chip label={orders.length} size="small" color="primary" variant="outlined" />
          </Box>
        }
        subheader={
          loading
            ? 'Loading…'
            : orders.length === 0
            ? 'No orders placed yet'
            : `Showing ${orders.length} order${orders.length !== 1 ? 's' : ''}`
        }
        action={
          onRefresh && (
            <Tooltip title="Refresh orders">
              <span>
                <IconButton onClick={onRefresh} disabled={loading} size="small" sx={{ mr: 1, mt: 0.5 }}>
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
          )
        }
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <CircularProgress size={32} />
          </Box>
        ) : orders.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">Place your first order above</Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: 'grey.50' } }}>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Customer</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="center">Status</TableCell>
                  <TableCell>Created</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace" fontSize="0.78rem" color="text.secondary">
                        {o.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={500}>{o.customerId}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} color="primary">
                        ${o.totalAmount.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip label={o.status} size="small" color={STATUS_COLOR[o.status] ?? 'default'} variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(o.createdAt).toLocaleString()}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
