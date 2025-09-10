import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  ExpandMore,
  Folder,
  FolderOpen,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../stores/authStore';
import { categoriesAPI } from '../services/api';
import { DocumentCategory, UserRole } from '../types';

interface CategoryFormData {
  name: string;
  parentId: string;
  description: string;
  requiredApprovalRole: UserRole;
}

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocumentCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CategoryFormData>({
    defaultValues: {
      name: '',
      parentId: '',
      description: '',
      requiredApprovalRole: 'PRESIDENT',
    },
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoriesAPI.getCategories();
      setCategories(response.categories);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: DocumentCategory) => {
    if (category) {
      setEditingCategory(category);
      setValue('name', category.name);
      setValue('parentId', category.parentId || '');
      setValue('description', category.description || '');
      setValue('requiredApprovalRole', category.requiredApprovalRole);
    } else {
      setEditingCategory(null);
      reset();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingCategory(null);
    reset();
  };

  const onSubmit = async (data: CategoryFormData) => {
    try {
      setError(null);

      if (editingCategory) {
        await categoriesAPI.updateCategory(editingCategory.id, {
          name: data.name,
          parentId: data.parentId || undefined,
          description: data.description,
          requiredApprovalRole: data.requiredApprovalRole,
        });
      } else {
        await categoriesAPI.createCategory({
          name: data.name,
          parentId: data.parentId || undefined,
          description: data.description,
          requiredApprovalRole: data.requiredApprovalRole,
        });
      }

      handleCloseDialog();
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save category');
    }
  };

  const handleDelete = async (category: DocumentCategory) => {
    if (!window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      setError(null);
      await categoriesAPI.deleteCategory(category.id);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete category');
    } finally {
      setDeleting(false);
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

  const canManageCategories = user?.role === 'ADMIN' || user?.role === 'PRESIDENT';

  // Build hierarchical structure
  const buildHierarchy = (categories: DocumentCategory[], parentId: string | null = null): DocumentCategory[] => {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        ...cat,
        children: buildHierarchy(categories, cat.id)
      }));
  };

  const hierarchicalCategories = buildHierarchy(categories);

  const renderCategoryTree = (categoryList: DocumentCategory[], level = 0) => {
    return categoryList.map((category) => (
      <React.Fragment key={category.id}>
        <ListItem sx={{ pl: level * 4 + 2 }}>
          <ListItemText
            primary={
              <Box display="flex" alignItems="center" gap={1}>
                {category.children && category.children.length > 0 ? (
                  <FolderOpen color="primary" />
                ) : (
                  <Folder color="action" />
                )}
                <Typography variant="body1">{category.name}</Typography>
                <Chip
                  label={getRoleLabel(category.requiredApprovalRole)}
                  size="small"
                  variant="outlined"
                />
                {category._count && (
                  <Chip
                    label={`${category._count.documents} documents`}
                    size="small"
                    color="primary"
                  />
                )}
              </Box>
            }
            secondary={
              category.description && (
                <Typography variant="body2" color="text.secondary">
                  {category.description}
                </Typography>
              )
            }
          />
          {canManageCategories && (
            <ListItemSecondaryAction>
              <IconButton
                size="small"
                onClick={() => handleOpenDialog(category)}
              >
                <Edit />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDelete(category)}
                color="error"
                disabled={deleting}
              >
                <Delete />
              </IconButton>
            </ListItemSecondaryAction>
          )}
        </ListItem>
        {category.children && category.children.length > 0 && (
          <Box sx={{ pl: 2 }}>
            {renderCategoryTree(category.children, level + 1)}
          </Box>
        )}
      </React.Fragment>
    ));
  };

  if (loading) {
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
          Document Categories
        </Typography>
        {canManageCategories && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            New Category
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {hierarchicalCategories.length > 0 ? (
            <List>
              {renderCategoryTree(hierarchicalCategories)}
            </List>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="h6" color="text.secondary">
                No categories found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {canManageCategories 
                  ? 'Create your first category to organize your documents.'
                  : 'Categories will appear here once they are created.'
                }
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Category Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Create New Category'}
        </DialogTitle>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            <TextField
              fullWidth
              label="Category Name"
              {...register('name', { required: 'Category name is required' })}
              error={!!errors.name}
              helperText={errors.name?.message}
              sx={{ mb: 2, mt: 1 }}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Parent Category</InputLabel>
              <Select
                {...register('parentId')}
                label="Parent Category"
              >
                <MenuItem value="">No parent (root category)</MenuItem>
                {categories
                  .filter(cat => !editingCategory || cat.id !== editingCategory.id)
                  .map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Description"
              {...register('description')}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth>
              <InputLabel>Required Approval Role</InputLabel>
              <Select
                {...register('requiredApprovalRole', { required: 'Approval role is required' })}
                label="Required Approval Role"
                error={!!errors.requiredApprovalRole}
              >
                <MenuItem value="PRESIDENT">President</MenuItem>
                <MenuItem value="BOARD_MEMBER">Board Member</MenuItem>
                <MenuItem value="COMMITTEE_MEMBER">Committee Member</MenuItem>
                <MenuItem value="ADMIN">Administrator</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingCategory ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage;