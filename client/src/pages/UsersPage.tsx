import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Grid,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Pagination,
  InputAdornment,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText as MuiListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  PersonAdd,
  Block,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { usersAPI } from '../services/api';
import { User, UserRole } from '../types';

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDialog, setUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [updating, setUpdating] = useState(false);

  const { user: currentUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormData>({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'VOLUNTEER',
    },
  });

  useEffect(() => {
    fetchUsers();
  }, [page, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await usersAPI.getUsers({
        page,
        limit: 10,
        search: searchTerm || undefined,
        role: roleFilter || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      setUsers(response.users);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleRoleFilter = (event: any) => {
    setRoleFilter(event.target.value);
    setPage(1);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleOpenUserDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setValue('email', user.email);
      setValue('firstName', user.firstName);
      setValue('lastName', user.lastName);
      setValue('role', user.role);
    } else {
      setEditingUser(null);
      reset();
    }
    setUserDialog(true);
    handleMenuClose();
  };

  const handleCloseUserDialog = () => {
    setUserDialog(false);
    setEditingUser(null);
    reset();
  };

  const onSubmit = async (data: UserFormData) => {
    try {
      setUpdating(true);
      setError(null);

      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        });
      } else {
        // For new users, we would need a registration endpoint
        // For now, we'll just show an error
        setError('User creation is not implemented in this demo. Please use the registration endpoint.');
        return;
      }

      handleCloseUserDialog();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save user');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      await usersAPI.deactivateUser(selectedUser.id);
      handleMenuClose();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to deactivate user');
    }
  };

  const handleActivate = async () => {
    if (!selectedUser) return;

    try {
      setError(null);
      await usersAPI.activateUser(selectedUser.id);
      handleMenuClose();
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to activate user');
    }
  };

  const getRoleColor = (role: UserRole) => {
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

  const getRoleLabel = (role: UserRole) => {
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

  const canManageUsers = currentUser?.role === 'ADMIN' || currentUser?.role === 'PRESIDENT';
  const canEditUser = (user: User) => {
    return canManageUsers || user.id === currentUser?.id;
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Users
        </Typography>
        {canManageUsers && (
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => handleOpenUserDialog()}
          >
            Add User
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search users..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  value={roleFilter}
                  onChange={handleRoleFilter}
                  label="Role"
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="ADMIN">Administrator</MenuItem>
                  <MenuItem value="PRESIDENT">President</MenuItem>
                  <MenuItem value="BOARD_MEMBER">Board Member</MenuItem>
                  <MenuItem value="COMMITTEE_MEMBER">Committee Member</MenuItem>
                  <MenuItem value="VOLUNTEER">Volunteer</MenuItem>
                  <MenuItem value="PUBLIC">Public</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users List */}
      <Grid container spacing={2}>
        {users.map((user) => (
          <Grid item xs={12} key={user.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box display="flex" alignItems="center" flex={1}>
                    <Avatar sx={{ mr: 2 }}>
                      {user.firstName[0]}{user.lastName[0]}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {user.firstName} {user.lastName}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                        <Chip
                          label={getRoleLabel(user.role)}
                          size="small"
                          color={getRoleColor(user.role) as any}
                        />
                        {user.active === false && (
                          <Chip
                            label="Inactive"
                            size="small"
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Joined {new Date(user.createdAt!).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                  {canEditUser(user) && (
                    <IconButton
                      onClick={(e) => handleMenuOpen(e, user)}
                      size="small"
                    >
                      <MoreVert />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {users.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No users found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search criteria.
          </Typography>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, newPage) => setPage(newPage)}
            color="primary"
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleOpenUserDialog(selectedUser!)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        {selectedUser?.active !== false && canManageUsers && (
          <MenuItem onClick={handleDeactivate} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Block fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Deactivate</ListItemText>
          </MenuItem>
        )}
        {selectedUser?.active === false && canManageUsers && (
          <MenuItem onClick={handleActivate} sx={{ color: 'success.main' }}>
            <ListItemIcon>
              <CheckCircle fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* User Dialog */}
      <Dialog open={userDialog} onClose={handleCloseUserDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              label="Email"
              type="email"
              {...register('email', { 
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 2, mt: 1 }}
            />

            <TextField
              fullWidth
              label="First Name"
              {...register('firstName', { required: 'First name is required' })}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              sx={{ mb: 2 }}
            />

            <TextField
              fullWidth
              label="Last Name"
              {...register('lastName', { required: 'Last name is required' })}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              sx={{ mb: 2 }}
            />

            {canManageUsers && (
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select
                  {...register('role', { required: 'Role is required' })}
                  label="Role"
                  error={!!errors.role}
                >
                  <MenuItem value="VOLUNTEER">Volunteer</MenuItem>
                  <MenuItem value="COMMITTEE_MEMBER">Committee Member</MenuItem>
                  <MenuItem value="BOARD_MEMBER">Board Member</MenuItem>
                  <MenuItem value="PRESIDENT">President</MenuItem>
                  <MenuItem value="ADMIN">Administrator</MenuItem>
                </Select>
              </FormControl>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseUserDialog}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={updating}>
              {updating ? <CircularProgress size={20} /> : (editingUser ? 'Update' : 'Create')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default UsersPage;