import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import type { LoginResult } from '../api';

interface Props {
  session: LoginResult;
  onLogout: () => void;
}

export function AppHeader({ session, onLogout }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const initials = session.user.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{ borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'white', color: 'text.primary' }}
    >
      <Toolbar sx={{ gap: 1 }}>
        <InventoryIcon color="primary" sx={{ mr: 0.5 }} />
        <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
          Order Management
        </Typography>

        {session.user.roles?.[0] && (
          <Chip
            label={session.user.roles[0]}
            size="small"
            color={session.user.roles[0] === 'admin' ? 'secondary' : 'default'}
            variant="outlined"
            sx={{ mr: 1 }}
          />
        )}

        <Tooltip title={session.user.email ?? session.user.username}>
          <IconButton onClick={e => setAnchorEl(e.currentTarget)} size="small">
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: '0.85rem' }}>
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">{session.user.email}</Typography>
          </MenuItem>
          <MenuItem onClick={onLogout}>
            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
            Sign out
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
