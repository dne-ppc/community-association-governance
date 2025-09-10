import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'president' | 'board_member' | 'committee_member' | 'volunteer' | 'public';
  phone?: string;
  department?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: false,
  error: null,
};

// Async thunks
export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }) => {
    const response = await axios.post('/api/auth/login', { email, password });
    return response.data.data;
  }
);

export const register = createAsyncThunk(
  'auth/register',
  async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: string;
  }) => {
    const response = await axios.post('/api/auth/register', userData);
    return response.data.data;
  }
);

export const loadUser = createAsyncThunk('auth/loadUser', async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token');
  
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  const response = await axios.get('/api/auth/me');
  return response.data.data;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await axios.post('/api/auth/logout');
  localStorage.removeItem('token');
  delete axios.defaults.headers.common['Authorization'];
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      localStorage.setItem('token', action.payload);
      axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload}`;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Login failed';
        state.isAuthenticated = false;
        state.user = null;
      });

    // Register
    builder
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        localStorage.setItem('token', action.payload.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${action.payload.token}`;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Registration failed';
        state.isAuthenticated = false;
        state.user = null;
      });

    // Load User
    builder
      .addCase(loadUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(loadUser.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
        localStorage.removeItem('token');
      });

    // Logout
    builder
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setToken } = authSlice.actions;
export default authSlice.reducer;