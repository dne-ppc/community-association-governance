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
  CircularProgress,
  Alert,
  Pagination,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Search,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  GetApp,
  FilterList,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { documentsAPI, categoriesAPI, pdfAPI } from '../services/api';
import { Document, DocumentCategory, DocumentStatus } from '../types';

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocuments();
    fetchCategories();
  }, [page, searchTerm, selectedCategory, selectedStatus]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await documentsAPI.getDocuments({
        page,
        limit: 10,
        search: searchTerm || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      setDocuments(response.documents);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getCategories();
      setCategories(response.categories);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handleCategoryChange = (event: any) => {
    setSelectedCategory(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event: any) => {
    setSelectedStatus(event.target.value);
    setPage(1);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, document: Document) => {
    setAnchorEl(event.currentTarget);
    setSelectedDocument(document);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedDocument(null);
  };

  const handleView = () => {
    if (selectedDocument) {
      navigate(`/documents/${selectedDocument.id}`);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedDocument) {
      navigate(`/documents/${selectedDocument.id}/edit`);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const confirmDelete = async () => {
    if (!selectedDocument) return;

    try {
      setDeleting(true);
      await documentsAPI.deleteDocument(selectedDocument.id);
      setDeleteDialogOpen(false);
      fetchDocuments();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete document');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedDocument) return;

    try {
      const blob = await pdfAPI.generatePDF(selectedDocument.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedDocument.slug}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate PDF');
    }
    handleMenuClose();
  };

  const handleDownloadFillablePDF = async () => {
    if (!selectedDocument) return;

    try {
      const blob = await pdfAPI.generateFillablePDF(selectedDocument.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${selectedDocument.slug}-fillable.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate fillable PDF');
    }
    handleMenuClose();
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case 'LIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'UNDER_REVIEW': return 'info';
      case 'APPROVED': return 'success';
      case 'ARCHIVED': return 'default';
      default: return 'default';
    }
  };

  const canEdit = (document: Document) => {
    return user?.role === 'ADMIN' || 
           user?.role === 'PRESIDENT' || 
           user?.role === 'BOARD_MEMBER' ||
           document.authorId === user?.id;
  };

  const canDelete = (document: Document) => {
    return user?.role === 'ADMIN' || 
           user?.role === 'PRESIDENT' ||
           document.authorId === user?.id;
  };

  if (loading && documents.length === 0) {
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
          Documents
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/documents/new')}
        >
          New Document
        </Button>
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
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search documents..."
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
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={selectedCategory}
                  onChange={handleCategoryChange}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={selectedStatus}
                  onChange={handleStatusChange}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="LIVE">Live</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                  <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
                  <MenuItem value="APPROVED">Approved</MenuItem>
                  <MenuItem value="ARCHIVED">Archived</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Grid container spacing={2}>
        {documents.map((document) => (
          <Grid item xs={12} key={document.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {document.title}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <Chip
                        label={document.status}
                        size="small"
                        color={getStatusColor(document.status) as any}
                      />
                      {document.hasFillableFields && (
                        <Chip
                          label="Fillable Form"
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {document.isPublic && (
                        <Chip
                          label="Public"
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Category: {document.category?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Created by {document.author?.firstName} {document.author?.lastName} on{' '}
                      {new Date(document.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, document)}
                    size="small"
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {documents.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No documents found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try adjusting your search criteria or create a new document.
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
        <MenuItem onClick={handleView}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        {selectedDocument && canEdit(selectedDocument) && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDownloadPDF}>
          <ListItemIcon>
            <GetApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {selectedDocument?.hasFillableFields && (
          <MenuItem onClick={handleDownloadFillablePDF}>
            <ListItemIcon>
              <GetApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download Fillable PDF</ListItemText>
          </MenuItem>
        )}
        {selectedDocument && canDelete(selectedDocument) && (
          <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Delete fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Document</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedDocument?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={confirmDelete}
            color="error"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentsPage;