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
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save,
  Cancel,
  Add,
  Delete,
  ExpandMore,
  Description,
} from '@mui/icons-material';
import { useForm, useFieldArray } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { documentsAPI, categoriesAPI } from '../services/api';
import { Document, DocumentCategory, FieldType, CreateDocumentRequest, UpdateDocumentRequest } from '../types';

interface FormField {
  fieldName: string;
  fieldType: FieldType;
  required: boolean;
  placeholderText: string;
  options: string[];
}

interface DocumentFormData {
  title: string;
  categoryId: string;
  contentMarkdown: string;
  isPublic: boolean;
  formFields: FormField[];
  changeDescription: string;
}

const DocumentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [document, setDocument] = useState<Document | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formFieldDialog, setFormFieldDialog] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);

  const isEditing = Boolean(id);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DocumentFormData>({
    defaultValues: {
      title: '',
      categoryId: '',
      contentMarkdown: '',
      isPublic: false,
      formFields: [],
      changeDescription: '',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'formFields',
  });

  const watchedFormFields = watch('formFields');

  useEffect(() => {
    fetchCategories();
    if (isEditing && id) {
      fetchDocument();
    } else {
      setLoading(false);
    }
  }, [id, isEditing]);

  const fetchDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await documentsAPI.getDocument(id!);
      const doc = response.document;
      setDocument(doc);
      
      // Set form values
      setValue('title', doc.title);
      setValue('categoryId', doc.categoryId);
      setValue('contentMarkdown', doc.contentMarkdown);
      setValue('isPublic', doc.isPublic);
      
      // Convert form fields
      const formFields: FormField[] = doc.formFields?.map(field => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required,
        placeholderText: field.placeholderText || '',
        options: field.options ? JSON.parse(field.options) : [],
      })) || [];
      setValue('formFields', formFields);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load document');
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

  const onSubmit = async (data: DocumentFormData) => {
    try {
      setSaving(true);
      setError(null);

      // Convert form fields for API
      const apiFormFields = data.formFields.map(field => ({
        fieldName: field.fieldName,
        fieldType: field.fieldType,
        required: field.required,
        placeholderText: field.placeholderText,
        options: field.options.length > 0 ? JSON.stringify(field.options) : undefined,
      }));

      if (isEditing && id) {
        const updateData: UpdateDocumentRequest = {
          title: data.title,
          contentMarkdown: data.contentMarkdown,
          isPublic: data.isPublic,
          formFields: apiFormFields,
          changeDescription: data.changeDescription,
        };
        await documentsAPI.updateDocument(id, updateData);
      } else {
        const createData: CreateDocumentRequest = {
          title: data.title,
          categoryId: data.categoryId,
          contentMarkdown: data.contentMarkdown,
          isPublic: data.isPublic,
          formFields: apiFormFields,
        };
        const response = await documentsAPI.createDocument(createData);
        navigate(`/documents/${response.document.id}`);
        return;
      }

      navigate(`/documents/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleAddFormField = () => {
    setEditingFieldIndex(null);
    setFormFieldDialog(true);
  };

  const handleEditFormField = (index: number) => {
    setEditingFieldIndex(index);
    setFormFieldDialog(true);
  };

  const handleSaveFormField = (fieldData: FormField) => {
    if (editingFieldIndex !== null) {
      update(editingFieldIndex, fieldData);
    } else {
      append(fieldData);
    }
    setFormFieldDialog(false);
    setEditingFieldIndex(null);
  };

  const getFieldTypeLabel = (type: FieldType) => {
    switch (type) {
      case 'TEXT': return 'Text Input';
      case 'EMAIL': return 'Email Input';
      case 'DATE': return 'Date Picker';
      case 'TEXTAREA': return 'Text Area';
      case 'CHECKBOX': return 'Checkboxes';
      case 'RADIO': return 'Radio Buttons';
      case 'SELECT': return 'Dropdown';
      case 'SIGNATURE': return 'Signature Field';
      default: return type;
    }
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
        <Typography variant="h4">
          {isEditing ? 'Edit Document' : 'Create New Document'}
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Cancel />}
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSubmit(onSubmit)}
            disabled={saving}
          >
            {saving ? <CircularProgress size={20} /> : 'Save'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Document Information
                </Typography>
                
                <TextField
                  fullWidth
                  label="Title"
                  {...register('title', { required: 'Title is required' })}
                  error={!!errors.title}
                  helperText={errors.title?.message}
                  sx={{ mb: 2 }}
                />

                {!isEditing && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      {...register('categoryId', { required: 'Category is required' })}
                      error={!!errors.categoryId}
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      {...register('isPublic')}
                    />
                  }
                  label="Make this document public"
                  sx={{ mb: 2 }}
                />

                <TextField
                  fullWidth
                  multiline
                  rows={20}
                  label="Content (Markdown)"
                  {...register('contentMarkdown', { required: 'Content is required' })}
                  error={!!errors.contentMarkdown}
                  helperText={errors.contentMarkdown?.message}
                />

                {isEditing && (
                  <TextField
                    fullWidth
                    label="Change Description"
                    {...register('changeDescription')}
                    helperText="Describe what changes you made to this document"
                    sx={{ mt: 2 }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* Form Fields */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h6">
                    Form Fields
                  </Typography>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={handleAddFormField}
                  >
                    Add Field
                  </Button>
                </Box>

                {fields.length > 0 ? (
                  <List>
                    {fields.map((field, index) => (
                      <ListItem key={field.id} divider>
                        <ListItemText
                          primary={field.fieldName}
                          secondary={
                            <Box>
                              <Chip
                                label={getFieldTypeLabel(field.fieldType)}
                                size="small"
                                sx={{ mr: 1 }}
                              />
                              {field.required && (
                                <Chip
                                  label="Required"
                                  size="small"
                                  color="error"
                                />
                              )}
                            </Box>
                          }
                        />
                        <ListItemSecondaryAction>
                          <IconButton
                            size="small"
                            onClick={() => handleEditFormField(index)}
                          >
                            <Description />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => remove(index)}
                            color="error"
                          >
                            <Delete />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    No form fields added. Click "Add Field" to create fillable form elements.
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>

      {/* Form Field Dialog */}
      <FormFieldDialog
        open={formFieldDialog}
        onClose={() => setFormFieldDialog(false)}
        onSave={handleSaveFormField}
        field={editingFieldIndex !== null ? watchedFormFields[editingFieldIndex] : undefined}
      />
    </Box>
  );
};

// Form Field Dialog Component
interface FormFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (field: FormField) => void;
  field?: FormField;
}

const FormFieldDialog: React.FC<FormFieldDialogProps> = ({ open, onClose, onSave, field }) => {
  const [fieldData, setFieldData] = useState<FormField>({
    fieldName: '',
    fieldType: 'TEXT',
    required: false,
    placeholderText: '',
    options: [],
  });

  useEffect(() => {
    if (field) {
      setFieldData(field);
    } else {
      setFieldData({
        fieldName: '',
        fieldType: 'TEXT',
        required: false,
        placeholderText: '',
        options: [],
      });
    }
  }, [field, open]);

  const handleSave = () => {
    if (fieldData.fieldName.trim()) {
      onSave(fieldData);
    }
  };

  const handleOptionsChange = (value: string) => {
    const options = value.split('\n').filter(opt => opt.trim());
    setFieldData(prev => ({ ...prev, options }));
  };

  const needsOptions = ['CHECKBOX', 'RADIO', 'SELECT'].includes(fieldData.fieldType);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {field ? 'Edit Form Field' : 'Add Form Field'}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Field Name"
          value={fieldData.fieldName}
          onChange={(e) => setFieldData(prev => ({ ...prev, fieldName: e.target.value }))}
          sx={{ mb: 2, mt: 1 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Field Type</InputLabel>
          <Select
            value={fieldData.fieldType}
            onChange={(e) => setFieldData(prev => ({ ...prev, fieldType: e.target.value as FieldType }))}
            label="Field Type"
          >
            <MenuItem value="TEXT">Text Input</MenuItem>
            <MenuItem value="EMAIL">Email Input</MenuItem>
            <MenuItem value="DATE">Date Picker</MenuItem>
            <MenuItem value="TEXTAREA">Text Area</MenuItem>
            <MenuItem value="CHECKBOX">Checkboxes</MenuItem>
            <MenuItem value="RADIO">Radio Buttons</MenuItem>
            <MenuItem value="SELECT">Dropdown</MenuItem>
            <MenuItem value="SIGNATURE">Signature Field</MenuItem>
          </Select>
        </FormControl>

        <TextField
          fullWidth
          label="Placeholder Text"
          value={fieldData.placeholderText}
          onChange={(e) => setFieldData(prev => ({ ...prev, placeholderText: e.target.value }))}
          sx={{ mb: 2 }}
        />

        {needsOptions && (
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Options (one per line)"
            value={fieldData.options.join('\n')}
            onChange={(e) => handleOptionsChange(e.target.value)}
            helperText="Enter each option on a new line"
            sx={{ mb: 2 }}
          />
        )}

        <FormControlLabel
          control={
            <Switch
              checked={fieldData.required}
              onChange={(e) => setFieldData(prev => ({ ...prev, required: e.target.checked }))}
            />
          }
          label="Required field"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DocumentEditPage;