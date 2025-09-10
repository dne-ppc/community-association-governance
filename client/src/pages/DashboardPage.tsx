import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Button,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Description,
  Approval,
  Category,
  People,
  TrendingUp,
  Schedule,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { documentsAPI, approvalsAPI, categoriesAPI, usersAPI } from '../services/api';
import { Document, ApprovalRequest, DocumentCategory, User } from '../types';

interface DashboardStats {
  totalDocuments: number;
  pendingApprovals: number;
  totalCategories: number;
  totalUsers: number;
  recentDocuments: Document[];
  pendingApprovalRequests: ApprovalRequest[];
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [documentsResponse, approvalsResponse, categoriesResponse, usersResponse] = await Promise.all([
          documentsAPI.getDocuments({ limit: 5, sortBy: 'createdAt', sortOrder: 'desc' }),
          approvalsAPI.getApprovalRequests({ status: 'PENDING', limit: 5 }),
          categoriesAPI.getCategories(),
          user?.role === 'ADMIN' || user?.role === 'PRESIDENT' 
            ? usersAPI.getUsers({ limit: 1 })
            : Promise.resolve({ users: [], pagination: { total: 0, page: 1, limit: 1, pages: 0 } })
        ]);

        setStats({
          totalDocuments: documentsResponse.pagination.total,
          pendingApprovals: approvalsResponse.pagination.total,
          totalCategories: categoriesResponse.categories.length,
          totalUsers: usersResponse.pagination.total,
          recentDocuments: documentsResponse.documents,
          pendingApprovalRequests: approvalsResponse.approvalRequests,
        });
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.role]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }> = ({ title, value, icon, color, onClick }) => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        '&:hover': onClick ? { boxShadow: 3 } : {}
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom variant="h6">
              {title}
            </Typography>
            <Typography variant="h4" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color, fontSize: 40 }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVE': return 'success';
      case 'PENDING': return 'warning';
      case 'UNDER_REVIEW': return 'info';
      case 'APPROVED': return 'success';
      default: return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Welcome back, {user?.firstName}! Here's what's happening in your community association.
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Documents"
            value={stats.totalDocuments}
            icon={<Description />}
            color="primary.main"
            onClick={() => navigate('/documents')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Approvals"
            value={stats.pendingApprovals}
            icon={<Approval />}
            color="warning.main"
            onClick={() => navigate('/approvals')}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Categories"
            value={stats.totalCategories}
            icon={<Category />}
            color="info.main"
            onClick={() => navigate('/categories')}
          />
        </Grid>
        {(user?.role === 'ADMIN' || user?.role === 'PRESIDENT') && (
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              icon={<People />}
              color="secondary.main"
              onClick={() => navigate('/users')}
            />
          </Grid>
        )}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" component="div">
                  Recent Documents
                </Typography>
                <Button size="small" onClick={() => navigate('/documents')}>
                  View All
                </Button>
              </Box>
              {stats.recentDocuments.length > 0 ? (
                <List>
                  {stats.recentDocuments.map((doc) => (
                    <ListItem
                      key={doc.id}
                      button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      <ListItemIcon>
                        <Description />
                      </ListItemIcon>
                      <ListItemText
                        primary={doc.title}
                        secondary={
                          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                            <Chip
                              label={doc.status}
                              size="small"
                              color={getStatusColor(doc.status) as any}
                            />
                            <Typography variant="caption" color="text.secondary">
                              by {doc.author?.firstName} {doc.author?.lastName}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No documents found.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6" component="div">
                  Pending Approvals
                </Typography>
                <Button size="small" onClick={() => navigate('/approvals')}>
                  View All
                </Button>
              </Box>
              {stats.pendingApprovalRequests.length > 0 ? (
                <List>
                  {stats.pendingApprovalRequests.map((approval) => (
                    <ListItem
                      key={approval.id}
                      button
                      onClick={() => navigate(`/approvals`)}
                    >
                      <ListItemIcon>
                        <Schedule />
                      </ListItemIcon>
                      <ListItemText
                        primary={approval.document?.title}
                        secondary={
                          <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              Requested by {approval.requester?.firstName} {approval.requester?.lastName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              • {new Date(approval.requestedAt).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary">
                  No pending approvals.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;