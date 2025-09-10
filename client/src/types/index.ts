export enum UserRole {
  ADMIN = 'ADMIN',
  PRESIDENT = 'PRESIDENT',
  BOARD_MEMBER = 'BOARD_MEMBER',
  COMMITTEE_MEMBER = 'COMMITTEE_MEMBER',
  VOLUNTEER = 'VOLUNTEER',
  PUBLIC = 'PUBLIC'
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  LIVE = 'LIVE',
  ARCHIVED = 'ARCHIVED'
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export enum FieldType {
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  DATE = 'DATE',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
  SELECT = 'SELECT',
  SIGNATURE = 'SIGNATURE',
  TEXTAREA = 'TEXTAREA'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  active?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface DocumentCategory {
  id: string;
  name: string;
  parentId?: string;
  description?: string;
  requiredApprovalRole: UserRole;
  createdAt: string;
  updatedAt: string;
  parent?: DocumentCategory;
  children?: DocumentCategory[];
  _count?: {
    documents: number;
  };
}

export interface FormField {
  id: string;
  documentId: string;
  fieldName: string;
  fieldType: FieldType;
  position: number;
  required: boolean;
  placeholderText?: string;
  options?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  slug: string;
  categoryId: string;
  status: DocumentStatus;
  contentMarkdown: string;
  isPublic: boolean;
  hasFillableFields: boolean;
  authorId: string;
  approvedById?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  approver?: User;
  category?: DocumentCategory;
  versions?: DocumentVersion[];
  formFields?: FormField[];
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  contentMarkdown: string;
  changeDescription?: string;
  contentDiff?: string;
  authorId: string;
  createdAt: string;
  author?: User;
}

export interface ApprovalRequest {
  id: string;
  documentId: string;
  requestedById: string;
  status: ApprovalStatus;
  notes?: string;
  requestedAt: string;
  reviewedById?: string;
  reviewedAt?: string;
  document?: Document;
  requester?: User;
  reviewer?: User;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
  timestamp: string;
  user?: User;
  document?: Document;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface CreateDocumentRequest {
  title: string;
  categoryId: string;
  contentMarkdown: string;
  isPublic?: boolean;
  formFields?: Omit<FormField, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>[];
}

export interface UpdateDocumentRequest {
  title?: string;
  contentMarkdown?: string;
  isPublic?: boolean;
  formFields?: Omit<FormField, 'id' | 'documentId' | 'createdAt' | 'updatedAt'>[];
  changeDescription?: string;
}

export interface CreateCategoryRequest {
  name: string;
  parentId?: string;
  description?: string;
  requiredApprovalRole?: UserRole;
}

export interface UpdateCategoryRequest {
  name?: string;
  parentId?: string;
  description?: string;
  requiredApprovalRole?: UserRole;
}

export interface ApprovalRequestRequest {
  documentId: string;
  notes?: string;
}

export interface ReviewApprovalRequest {
  status: ApprovalStatus;
  notes?: string;
}