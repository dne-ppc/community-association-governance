import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit,
  Lock,
  Person,
  Email,
  CalendarToday,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';
import { User } from '../types';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ProfilePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const { user, updateUser } = useAuthStore();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
    },
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    watch,
    formState: { errors: passwordErrors },
  } = useForm<PasswordFormData>();

  const newPassword = watch('newPassword');

  useEffect(() => {
    if (user) {
      resetProfile({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      });
    }
  }, [user, resetProfile]);

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await authAPI.updateProfile(data);
      updateUser(response.user);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setChangingPassword(true);
      setError(null);
      setSuccess(null);

      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setPasswordDialog(false);
      resetPassword();
      setSuccess('Password changed successfully');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'PRESIDENT': return 'President';
      case 'BOARD_MEMBER': return 'Board Member';
      case 'COMMITTEE_MEMBER': return 'Committee Member';
      case 'VOLUNTEER': return 'Volunteer';
      case 'PUBLIC': return 'Public';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'error';
      case 'PRESIDENT': return 'primary';
      case 'BOARD_MEMBER': return 'secondary';
      case 'COMMITTEE_MEMBER': return 'info';
      case 'VOLUNTEER': return 'success';
      case 'PUBLIC': return 'default';
      default: return 'default';
    }
  };

  if (!user) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h6">
                  Personal Information
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Lock />}
                  onClick={() => setPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </Box>

              <form onSubmit={handleProfileSubmit(onProfileSubmit)}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      {...registerProfile('firstName', { required: 'First name is required' })}
                      error={!!profileErrors.firstName}
                      helperText={profileErrors.firstName?.message}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      {...registerProfile('lastName', { required: 'Last name is required' })}
                      error={!!profileErrors.lastName}
                      helperText={profileErrors.lastName?.message}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      {...registerProfile('email', {
                        required: 'Email is required',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Invalid email address',
                        },
                      })}
                      error={!!profileErrors.email}
                      helperText={profileErrors.email?.message}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Update Profile'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Account Information */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Information
              </Typography>

              <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <Avatar sx={{ mr: 2, width: 56, height: 56 }}>
                  {user.firstName[0]}{user.lastName[0]}
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Chip
                    label={getRoleLabel(user.role)}
                    color={getRoleColor(user.role) as any}
                    size="small"
                  />
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <Email sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {user.email}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" sx={{ mb: 1 }}>
                <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Member since {new Date(user.createdAt!).toLocaleDateString()}
                </Typography>
              </Box>

              {user.lastLogin && (
                <Box display="flex" alignItems="center">
                  <Person sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    Last login {new Date(user.lastLogin).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <form onSubmit={handlePasswordSubmit(onPasswordSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              label="Current Password"
              type="password"
              {...registerPassword('currentPassword', { required: 'Current password is required' })}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword?.message}
              sx={{ mb: 2, mt: 1 }}
            />

            <TextField
              fullWidth
              label="New Password"
              type="password"
              {...registerPassword('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 6,
                  message: 'Password must be at least 6 characters',
                },
              })}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword?.message}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Confirm New Password"
              type="password"
              {...registerPassword('confirmPassword', {
                required: 'Please confirm your new password',
                validate: (value) =>
                  value === newPassword || 'Passwords do not match',
              })}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword?.message}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={changingPassword}>
              {changingPassword ? <CircularProgress size={20} /> : 'Change Password'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default ProfilePage;