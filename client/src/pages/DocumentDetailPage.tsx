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
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemAvatar,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Edit,
  GetApp,
  MoreVert,
  History,
  Approval,
  Person,
  Schedule,
  Description,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { documentsAPI, approvalsAPI, pdfAPI } from '../services/api';
import { Document, DocumentVersion, ApprovalRequest, DocumentStatus } from '../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DocumentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [requestApprovalDialog, setRequestApprovalDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDocument();
      fetchVersions();
      fetchApprovalRequests();
    }
  }, [id]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsAPI.getDocument(id!);
      setDocument(response.document);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const fetchVersions = async () => {
    try {
      const response = await documentsAPI.getDocumentVersions(id!);
      setVersions(response.versions);
    } catch (err: any) {
      console.error('Failed to load versions:', err);
    }
  };

  const fetchApprovalRequests = async () => {
    try {
      const response = await approvalsAPI.getApprovalRequests({ 
        page: 1, 
        limit: 10 
      });
      // Filter for this document's approval requests
      const docApprovals = response.approvalRequests.filter(
        req => req.documentId === id
      );
      setApprovalRequests(docApprovals);
    } catch (err: any) {
      console.error('Failed to load approval requests:', err);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    navigate(`/documents/${id}/edit`);
    handleMenuClose();
  };

  const handleDownloadPDF = async () => {
    try {
      const blob = await pdfAPI.generatePDF(id!);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${document?.slug}.pdf`;
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
    try {
      const blob = await pdfAPI.generateFillablePDF(id!);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${document?.slug}-fillable.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate fillable PDF');
    }
    handleMenuClose();
  };

  const handleRequestApproval = async () => {
    try {
      await approvalsAPI.requestApproval({
        documentId: id!,
        notes: 'Please review and approve this document.'
      });
      setRequestApprovalDialog(false);
      fetchApprovalRequests();
      fetchDocument(); // Refresh document status
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to request approval');
    }
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

  const canEdit = () => {
    if (!document || !user) return false;
    return user.role === 'ADMIN' || 
           user.role === 'PRESIDENT' || 
           user.role === 'BOARD_MEMBER' ||
           document.authorId === user.id;
  };

  const canRequestApproval = () => {
    if (!document || !user) return false;
    return (user.role === 'ADMIN' || 
            user.role === 'PRESIDENT' || 
            user.role === 'BOARD_MEMBER' ||
            document.authorId === user.id) &&
           document.status === 'PENDING';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !document) {
    return (
      <Alert severity="error">
        {error || 'Document not found'}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box flex={1}>
          <Typography variant="h4" gutterBottom>
            {document.title}
          </Typography>
          <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
            <Chip
              label={document.status}
              color={getStatusColor(document.status) as any}
            />
            {document.hasFillableFields && (
              <Chip
                label="Fillable Form"
                variant="outlined"
              />
            )}
            {document.isPublic && (
              <Chip
                label="Public"
                variant="outlined"
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            Category: {document.category?.name} • 
            Created by {document.author?.firstName} {document.author?.lastName} on{' '}
            {new Date(document.createdAt).toLocaleDateString()}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          {canRequestApproval() && (
            <Button
              variant="contained"
              startIcon={<Approval />}
              onClick={() => setRequestApprovalDialog(true)}
            >
              Request Approval
            </Button>
          )}
          {canEdit() && (
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              Edit
            </Button>
          )}
          <IconButton onClick={handleMenuOpen}>
            <MoreVert />
          </IconButton>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
            <Tab label="Content" icon={<Description />} />
            <Tab label="Versions" icon={<History />} />
            <Tab label="Approvals" icon={<Approval />} />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <ReactMarkdown>{document.contentMarkdown}</ReactMarkdown>
          
          {document.formFields && document.formFields.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Form Fields
              </Typography>
              <List>
                {document.formFields.map((field) => (
                  <ListItem key={field.id}>
                    <ListItemText
                      primary={field.fieldName}
                      secondary={`Type: ${field.fieldType} • Required: ${field.required ? 'Yes' : 'No'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <List>
            {versions.map((version) => (
              <ListItem key={version.id} divider>
                <ListItemAvatar>
                  <Avatar>
                    <Person />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Version ${version.versionNumber}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {version.changeDescription || 'No description provided'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        by {version.author?.firstName} {version.author?.lastName} on{' '}
                        {new Date(version.createdAt).toLocaleString()}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
            ))}
          </List>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <List>
            {approvalRequests.map((request) => (
              <ListItem key={request.id} divider>
                <ListItemAvatar>
                  <Avatar>
                    <Approval />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`Status: ${request.status}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Requested by {request.requester?.firstName} {request.requester?.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(request.requestedAt).toLocaleString()}
                      </Typography>
                      {request.notes && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          {request.notes}
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </ListItem>
            ))}
            {approvalRequests.length === 0 && (
              <Typography color="text.secondary">
                No approval requests found for this document.
              </Typography>
            )}
          </List>
        </TabPanel>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleDownloadPDF}>
          <ListItemIcon>
            <GetApp fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
        {document.hasFillableFields && (
          <MenuItem onClick={handleDownloadFillablePDF}>
            <ListItemIcon>
              <GetApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download Fillable PDF</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Request Approval Dialog */}
      <Dialog open={requestApprovalDialog} onClose={() => setRequestApprovalDialog(false)}>
        <DialogTitle>Request Approval</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to request approval for "{document.title}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRequestApprovalDialog(false)}>Cancel</Button>
          <Button onClick={handleRequestApproval} variant="contained">
            Request Approval
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DocumentDetailPage;