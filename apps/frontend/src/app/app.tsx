import { useState, useEffect, useCallback } from 'react';
import { Box, Container, CssBaseline, ThemeProvider } from '@mui/material';
import type { Order } from '@poc/shared-types';
import { theme } from './theme';
import { AUTH_MODE, clearToken, fetchOrders } from '../shared/api';
import type { LoginResult } from '../shared/api';
import { AppHeader } from '../shared/components/AppHeader';
import { LoginPage } from '../features/auth/LoginPage';
import { useCognitoAuth } from '../features/auth/useCognitoAuth';
import { CreateOrderForm } from '../features/orders/CreateOrderForm';
import { OrderList } from '../features/orders/OrderList';

export function App() {
  const [session, setSession]           = useState<LoginResult | null>(null);
  const [orders, setOrders]             = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Cognito: parse token from URL hash after Hosted UI redirect
  useCognitoAuth(result => setSession(result));

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      setOrders(await fetchOrders());
    } catch {
      // silently ignore — table shows empty state
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) void loadOrders();
  }, [session, loadOrders]);

  const handleLoggedIn = (result: LoginResult) => {
    setSession(result);
    setOrders([]);
  };

  const handleLogout = () => {
    clearToken();
    setSession(null);
    setOrders([]);
  };

  if (!session) {
    if (AUTH_MODE === 'cognito') return null;
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoggedIn={handleLoggedIn} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppHeader session={session} onLogout={handleLogout} />
      <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <CreateOrderForm onCreated={order => setOrders(prev => [order, ...prev])} />
          <OrderList orders={orders} loading={ordersLoading} onRefresh={loadOrders} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
