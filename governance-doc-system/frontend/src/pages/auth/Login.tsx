import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { AppDispatch } from '../../store';
import { login } from '../../store/slices/authSlice';

interface LoginForm {
  email: string;
  password: string;
  remember: boolean;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setError('');
    setLoading(true);
    
    try {
      await dispatch(login({ email: data.email, password: data.password })).unwrap();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TextField
        fullWidth
        label="Email Address"
        type="email"
        margin="normal"
        {...register('email', {
          required: 'Email is required',
          pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message: 'Invalid email address',
          },
        })}
        error={!!errors.email}
        helperText={errors.email?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Email color="action" />
            </InputAdornment>
          ),
        }}
      />

      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        margin="normal"
        {...register('password', {
          required: 'Password is required',
          minLength: {
            value: 8,
            message: 'Password must be at least 8 characters',
          },
        })}
        error={!!errors.password}
        helperText={errors.password?.message}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Lock color="action" />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={() => setShowPassword(!showPassword)}
                edge="end"
              >
                {showPassword ? <VisibilityOff /> : <Visibility />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <FormControlLabel
        control={
          <Checkbox
            {...register('remember')}
            color="primary"
          />
        }
        label="Remember me"
        sx={{ mt: 1 }}
      />

      <Button
        type="submit"
        fullWidth
        variant="contained"
        size="large"
        disabled={loading}
        sx={{ mt: 3, mb: 2 }}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Link to="/forgot-password" style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary">
            Forgot Password?
          </Typography>
        </Link>
        <Link to="/register" style={{ textDecoration: 'none' }}>
          <Typography variant="body2" color="primary">
            Don't have an account? Sign Up
          </Typography>
        </Link>
      </Box>
    </Box>
  );
};

export default Login;