import axios, { AxiosResponse } from 'axios';
import { useAuthStore } from '../stores/authStore';
import {
  User,
  Document,
  DocumentCategory,
  ApprovalRequest,
  ActivityLog,
  LoginRequest,
  RegisterRequest,
  CreateDocumentRequest,
  UpdateDocumentRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  ApprovalRequestRequest,
  ReviewApprovalRequest,
  PaginationInfo
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (credentials: LoginRequest): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<{ user: User; token: string }> = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest): Promise<{ user: User; token: string }> => {
    const response: AxiosResponse<{ user: User; token: string }> = await api.post('/auth/register', userData);
    return response.data;
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (userData: Partial<User>): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.put('/auth/profile', userData);
    return response.data;
  },

  changePassword: async (passwords: { currentPassword: string; newPassword: string }): Promise<void> => {
    await api.put('/auth/change-password', passwords);
  },
};

// Documents API
export const documentsAPI = {
  getDocuments: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ documents: Document[]; pagination: PaginationInfo }> => {
    const response: AxiosResponse<{ documents: Document[]; pagination: PaginationInfo }> = await api.get('/documents', { params });
    return response.data;
  },

  getDocument: async (id: string): Promise<{ document: Document }> => {
    const response: AxiosResponse<{ document: Document }> = await api.get(`/documents/${id}`);
    return response.data;
  },

  createDocument: async (documentData: CreateDocumentRequest): Promise<{ document: Document }> => {
    const response: AxiosResponse<{ document: Document }> = await api.post('/documents', documentData);
    return response.data;
  },

  updateDocument: async (id: string, documentData: UpdateDocumentRequest): Promise<{ document: Document }> => {
    const response: AxiosResponse<{ document: Document }> = await api.put(`/documents/${id}`, documentData);
    return response.data;
  },

  deleteDocument: async (id: string): Promise<void> => {
    await api.delete(`/documents/${id}`);
  },

  getDocumentVersions: async (id: string): Promise<{ versions: any[] }> => {
    const response: AxiosResponse<{ versions: any[] }> = await api.get(`/documents/${id}/versions`);
    return response.data;
  },

  getDocumentDiff: async (id: string, fromVersion: number, toVersion: number): Promise<any> => {
    const response = await api.get(`/documents/${id}/diff`, {
      params: { fromVersion, toVersion }
    });
    return response.data;
  },
};

// Categories API
export const categoriesAPI = {
  getCategories: async (): Promise<{ categories: DocumentCategory[] }> => {
    const response: AxiosResponse<{ categories: DocumentCategory[] }> = await api.get('/categories');
    return response.data;
  },

  getCategory: async (id: string): Promise<{ category: DocumentCategory }> => {
    const response: AxiosResponse<{ category: DocumentCategory }> = await api.get(`/categories/${id}`);
    return response.data;
  },

  createCategory: async (categoryData: CreateCategoryRequest): Promise<{ category: DocumentCategory }> => {
    const response: AxiosResponse<{ category: DocumentCategory }> = await api.post('/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id: string, categoryData: UpdateCategoryRequest): Promise<{ category: DocumentCategory }> => {
    const response: AxiosResponse<{ category: DocumentCategory }> = await api.put(`/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await api.delete(`/categories/${id}`);
  },
};

// Approvals API
export const approvalsAPI = {
  getApprovalRequests: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ approvalRequests: ApprovalRequest[]; pagination: PaginationInfo }> => {
    const response: AxiosResponse<{ approvalRequests: ApprovalRequest[]; pagination: PaginationInfo }> = await api.get('/approvals', { params });
    return response.data;
  },

  getApprovalRequest: async (id: string): Promise<{ approvalRequest: ApprovalRequest }> => {
    const response: AxiosResponse<{ approvalRequest: ApprovalRequest }> = await api.get(`/approvals/${id}`);
    return response.data;
  },

  requestApproval: async (requestData: ApprovalRequestRequest): Promise<{ approvalRequest: ApprovalRequest }> => {
    const response: AxiosResponse<{ approvalRequest: ApprovalRequest }> = await api.post('/approvals/request', requestData);
    return response.data;
  },

  reviewApproval: async (id: string, reviewData: ReviewApprovalRequest): Promise<{ approvalRequest: ApprovalRequest }> => {
    const response: AxiosResponse<{ approvalRequest: ApprovalRequest }> = await api.put(`/approvals/${id}/review`, reviewData);
    return response.data;
  },

  cancelApprovalRequest: async (id: string): Promise<void> => {
    await api.put(`/approvals/${id}/cancel`);
  },
};

// Users API
export const usersAPI = {
  getUsers: async (params?: {
    page?: number;
    limit?: number;
    role?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{ users: User[]; pagination: PaginationInfo }> => {
    const response: AxiosResponse<{ users: User[]; pagination: PaginationInfo }> = await api.get('/users', { params });
    return response.data;
  },

  getUser: async (id: string): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.get(`/users/${id}`);
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<{ user: User }> => {
    const response: AxiosResponse<{ user: User }> = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deactivateUser: async (id: string): Promise<void> => {
    await api.put(`/users/${id}/deactivate`);
  },

  activateUser: async (id: string): Promise<void> => {
    await api.put(`/users/${id}/activate`);
  },

  getUserActivity: async (id: string, params?: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
  }): Promise<{ activities: ActivityLog[]; pagination: PaginationInfo }> => {
    const response: AxiosResponse<{ activities: ActivityLog[]; pagination: PaginationInfo }> = await api.get(`/users/${id}/activity`, { params });
    return response.data;
  },
};

// PDF API
export const pdfAPI = {
  generatePDF: async (documentId: string): Promise<Blob> => {
    const response = await api.get(`/pdf/${documentId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  generateFillablePDF: async (documentId: string): Promise<Blob> => {
    const response = await api.get(`/pdf/${documentId}/fillable`, {
      responseType: 'blob'
    });
    return response.data;
  },

  previewPDF: async (documentId: string): Promise<{ document: Document; html: string }> => {
    const response: AxiosResponse<{ document: Document; html: string }> = await api.get(`/pdf/${documentId}/preview`);
    return response.data;
  },
};

export default api;