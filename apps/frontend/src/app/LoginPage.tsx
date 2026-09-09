import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  TextField,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { login, setToken, LoginResult } from './api';

interface Props {
  onLoggedIn: (result: LoginResult) => void;
}

export function LoginPage({ onLoggedIn }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login(username, password);
      setToken(result.accessToken);
      onLoggedIn(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, mx: 2, boxShadow: 4 }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48, height: 48, borderRadius: '50%',
                bgcolor: 'primary.main', display: 'flex',
                alignItems: 'center', justifyContent: 'center', mb: 1.5,
              }}
            >
              <LockOutlinedIcon sx={{ color: 'white' }} />
            </Box>
            <Typography variant="h5" fontWeight={700}>Sign in</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Order Management System
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              fullWidth
              required
              autoFocus
              autoComplete="username"
              sx={{ mb: 2 }}
            />
            <TextField
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              fullWidth
              required
              autoComplete="current-password"
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(v => !v)} edge="end" tabIndex={-1}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading || !username || !password}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign in'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Dev hint */}
          <Box sx={{ bgcolor: 'grey.100', borderRadius: 1, p: 1.5 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              Local dev accounts
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5, flexWrap: 'wrap' }}>
              {[
                { user: 'alice', pass: 'alice123', role: 'admin' },
                { user: 'bob',   pass: 'bob123',   role: 'user'  },
              ].map(({ user, pass, role }) => (
                <Button
                  key={user}
                  size="small"
                  variant="outlined"
                  onClick={() => { setUsername(user); setPassword(pass); }}
                  sx={{ textTransform: 'none', fontSize: '0.72rem' }}
                >
                  {user} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>({role})</Typography>
                </Button>
              ))}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
