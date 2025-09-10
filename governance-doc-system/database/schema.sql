-- Community Association Governance Document Management System
-- Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS governance_docs;
\c governance_docs;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('admin', 'president', 'board_member', 'committee_member', 'volunteer', 'public');
CREATE TYPE document_status AS ENUM ('pending', 'under_review', 'approved', 'archived', 'rejected');
CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected', 'changes_requested');
CREATE TYPE field_type AS ENUM ('text', 'textarea', 'checkbox', 'date', 'signature', 'dropdown', 'email', 'number');

-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role DEFAULT 'volunteer',
    phone VARCHAR(20),
    department VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP
);

-- Document categories table (self-referencing for hierarchy)
CREATE TABLE document_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_id UUID REFERENCES document_categories(id) ON DELETE CASCADE,
    description TEXT,
    icon VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    required_approval_role user_role DEFAULT 'president',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Documents table
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category_id UUID REFERENCES document_categories(id) ON DELETE SET NULL,
    status document_status DEFAULT 'pending',
    content_markdown TEXT,
    content_html TEXT,
    excerpt TEXT,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    has_fillable_fields BOOLEAN DEFAULT false,
    is_template BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Document versions table
CREATE TABLE document_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number VARCHAR(20) NOT NULL,
    content_markdown TEXT,
    content_html TEXT,
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_description TEXT,
    content_diff TEXT,
    is_major_version BOOLEAN DEFAULT false,
    UNIQUE(document_id, version_number)
);

-- Approval requests table
CREATE TABLE approval_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_id UUID REFERENCES document_versions(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status approval_status DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    notes TEXT,
    priority INTEGER DEFAULT 0,
    due_date DATE
);

-- Form fields table
CREATE TABLE form_fields (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(255) NOT NULL,
    field_type field_type NOT NULL,
    position INTEGER NOT NULL,
    required BOOLEAN DEFAULT false,
    placeholder_text VARCHAR(255),
    default_value TEXT,
    options JSONB, -- For dropdown fields
    validation_rules JSONB,
    width VARCHAR(20) DEFAULT '100%',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity log table
CREATE TABLE activity_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255)
);

-- Document tags table
CREATE TABLE tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document-tag relationship table
CREATE TABLE document_tags (
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- Comments table
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_resolved BOOLEAN DEFAULT false
);

-- Notifications table
CREATE TABLE notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Document attachments table
CREATE TABLE document_attachments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    storage_path TEXT NOT NULL,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions table
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document access permissions (for granular control)
CREATE TABLE document_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(document_id, user_id)
);

-- Saved searches table
CREATE TABLE saved_searches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    query TEXT NOT NULL,
    filters JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_category ON documents(category_id);
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_created ON documents(created_at DESC);
CREATE INDEX idx_documents_slug ON documents(slug);
CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_approval_requests_document ON approval_requests(document_id);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON activity_log(timestamp DESC);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_comments_document ON comments(document_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Full-text search indexes
CREATE INDEX idx_documents_fulltext ON documents USING gin(to_tsvector('english', title || ' ' || COALESCE(content_markdown, '')));
CREATE INDEX idx_documents_metadata ON documents USING gin(metadata);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update timestamp trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_categories_updated_at BEFORE UPDATE ON document_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_fields_updated_at BEFORE UPDATE ON form_fields
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();