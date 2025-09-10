import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Pagination,
  List,
  ListItem,
  ListItemText as MuiListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
} from '@mui/material';
import {
  MoreVert,
  Approval,
  Close,
  Visibility,
  Schedule,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { approvalsAPI } from '../services/api';
import { ApprovalRequest, ApprovalStatus } from '../types';

interface ReviewFormData {
  status: ApprovalStatus;
  notes: string;
}

const ApprovalsPage: React.FC = () => {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  const { user } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ReviewFormData>({
    defaultValues: {
      status: 'APPROVED',
      notes: '',
    },
  });

  useEffect(() => {
    fetchApprovalRequests();
  }, [page, statusFilter]);

  const fetchApprovalRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await approvalsAPI.getApprovalRequests({
        page,
        limit: 10,
        status: statusFilter || undefined,
        sortBy: 'requestedAt',
        sortOrder: 'desc',
      });

      setApprovalRequests(response.approvalRequests);
      setTotalPages(response.pagination.pages);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, request: ApprovalRequest) => {
    setAnchorEl(event.currentTarget);
    setSelectedRequest(request);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRequest(null);
  };

  const handleView = () => {
    setViewDialog(true);
    handleMenuClose();
  };

  const handleReview = () => {
    setReviewDialog(true);
    handleMenuClose();
  };

  const handleReviewSubmit = async (data: ReviewFormData) => {
    if (!selectedRequest) return;

    try {
      setReviewing(true);
      setError(null);

      await approvalsAPI.reviewApproval(selectedRequest.id, {
        status: data.status,
        notes: data.notes,
      });

      setReviewDialog(false);
      reset();
      fetchApprovalRequests();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to review approval request');
    } finally {
      setReviewing(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!selectedRequest) return;

    try {
      setError(null);
      await approvalsAPI.cancelApprovalRequest(selectedRequest.id);
      handleMenuClose();
      fetchApprovalRequests();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to cancel approval request');
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      case 'CANCELLED': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING': return <Schedule />;
      case 'APPROVED': return <CheckCircle />;
      case 'REJECTED': return <Cancel />;
      case 'CANCELLED': return <Close />;
      default: return <Schedule />;
    }
  };

  const canReview = (request: ApprovalRequest) => {
    if (!user) return false;
    return (user.role === 'ADMIN' || 
            user.role === 'PRESIDENT' || 
            user.role === 'BOARD_MEMBER') &&
           request.status === 'PENDING';
  };

  const canCancel = (request: ApprovalRequest) => {
    if (!user) return false;
    return (user.role === 'ADMIN' || 
            user.role === 'PRESIDENT' ||
            request.requestedById === user.id) &&
           request.status === 'PENDING';
  };

  if (loading && approvalRequests.length === 0) {
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
          Approval Requests
        </Typography>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            label="Filter by Status"
          >
            <MenuItem value="">All Statuses</MenuItem>
            <MenuItem value="PENDING">Pending</MenuItem>
            <MenuItem value="APPROVED">Approved</MenuItem>
            <MenuItem value="REJECTED">Rejected</MenuItem>
            <MenuItem value="CANCELLED">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={2}>
        {approvalRequests.map((request) => (
          <Grid item xs={12} key={request.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" gutterBottom>
                      {request.document?.title}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                      <Chip
                        icon={getStatusIcon(request.status)}
                        label={request.status}
                        color={getStatusColor(request.status) as any}
                        size="small"
                      />
                      <Chip
                        label={request.document?.category?.name}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Requested by {request.requester?.firstName} {request.requester?.lastName} on{' '}
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </Typography>
                    {request.notes && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                        "{request.notes}"
                      </Typography>
                    )}
                  </Box>
                  <IconButton
                    onClick={(e) => handleMenuOpen(e, request)}
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

      {approvalRequests.length === 0 && !loading && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="text.secondary">
            No approval requests found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {statusFilter 
              ? `No ${statusFilter.toLowerCase()} approval requests.`
              : 'Approval requests will appear here when documents are submitted for review.'
            }
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
          <ListItemText>View Document</ListItemText>
        </MenuItem>
        {selectedRequest && canReview(selectedRequest) && (
          <MenuItem onClick={handleReview}>
            <ListItemIcon>
              <Approval fontSize="small" />
            </ListItemIcon>
            <ListItemText>Review</ListItemText>
          </MenuItem>
        )}
        {selectedRequest && canCancel(selectedRequest) && (
          <MenuItem onClick={handleCancelRequest} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Cancel fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancel Request</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onClose={() => setReviewDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Review Approval Request</DialogTitle>
        <form onSubmit={handleSubmit(handleReviewSubmit)}>
          <DialogContent>
            <Typography variant="body1" gutterBottom>
              Document: <strong>{selectedRequest?.document?.title}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Requested by {selectedRequest?.requester?.firstName} {selectedRequest?.requester?.lastName}
            </Typography>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Decision</InputLabel>
              <Select
                {...register('status', { required: 'Decision is required' })}
                label="Decision"
                error={!!errors.status}
              >
                <MenuItem value="APPROVED">Approve</MenuItem>
                <MenuItem value="REJECTED">Reject</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={4}
              label="Review Notes"
              {...register('notes')}
              helperText="Optional notes about your decision"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setReviewDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={reviewing}>
              {reviewing ? <CircularProgress size={20} /> : 'Submit Review'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewDialog} onClose={() => setViewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedRequest?.document?.title}
        </DialogTitle>
        <DialogContent>
          {selectedRequest?.document && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Category: {selectedRequest.document.category?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Status: {selectedRequest.document.status}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Created by {selectedRequest.document.author?.firstName} {selectedRequest.document.author?.lastName}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {selectedRequest.document.contentMarkdown}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={() => {
              setViewDialog(false);
              if (selectedRequest?.document) {
                navigate(`/documents/${selectedRequest.document.id}`);
              }
            }}
          >
            View Full Document
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ApprovalsPage;