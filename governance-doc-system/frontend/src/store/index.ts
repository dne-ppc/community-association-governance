import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import documentReducer from './slices/documentSlice';
import categoryReducer from './slices/categorySlice';
import approvalReducer from './slices/approvalSlice';
import userReducer from './slices/userSlice';
import notificationReducer from './slices/notificationSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentReducer,
    categories: categoryReducer,
    approvals: approvalReducer,
    users: userReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
        ignoredPaths: ['auth.user'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;