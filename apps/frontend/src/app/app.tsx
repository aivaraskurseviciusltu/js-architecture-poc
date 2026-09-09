import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Container,
  CssBaseline,
  IconButton,
  Menu,
  MenuItem,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import { Order } from '@poc/shared-types';
import { LoginPage } from './LoginPage';
import { CreateOrderForm } from './CreateOrderForm';
import { OrderList } from './OrderList';
import { clearToken, LoginResult } from './api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary:   { main: '#1976d2' },
    secondary: { main: '#9c27b0' },
    background: { default: '#f5f7fa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      styleOverrides: { root: { borderRadius: 12 } },
    },
    MuiButton: {
      styleOverrides: { root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 } },
    },
  },
});

export function App() {
  const [session, setSession] = useState<LoginResult | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleLoggedIn = (result: LoginResult) => {
    setSession(result);
    setOrders([]);
  };

  const handleLogout = () => {
    clearToken();
    setSession(null);
    setOrders([]);
    setAnchorEl(null);
  };

  if (!session) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoginPage onLoggedIn={handleLoggedIn} />
      </ThemeProvider>
    );
  }

  const initials = session.user.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* ── Top bar ── */}
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white', color: 'text.primary' }}>
        <Toolbar sx={{ gap: 1 }}>
          <InventoryIcon color="primary" sx={{ mr: 0.5 }} />
          <Typography variant="h6" fontWeight={700} sx={{ flexGrow: 1 }}>
            Order Management
          </Typography>

          {/* Role chip */}
          {session.user.roles?.[0] && (
            <Chip
              label={session.user.roles[0]}
              size="small"
              color={session.user.roles[0] === 'admin' ? 'secondary' : 'default'}
              variant="outlined"
              sx={{ mr: 1 }}
            />
          )}

          {/* User avatar + menu */}
          <Tooltip title={session.user.email ?? session.user.username}>
            <IconButton onClick={e => setAnchorEl(e.currentTarget)} size="small">
              <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
                {initials}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">{session.user.email}</Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* ── Main content ── */}
      <Box sx={{ bgcolor: 'background.default', minHeight: 'calc(100vh - 64px)', py: 4 }}>
        <Container maxWidth="lg">
          <CreateOrderForm onCreated={order => setOrders(prev => [order, ...prev])} />
          <OrderList orders={orders} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
