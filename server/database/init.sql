-- Initialize the database with default categories and admin user
-- This script runs when the PostgreSQL container starts

-- Create default document categories
INSERT INTO document_categories (id, name, parent_id, description, required_approval_role, created_at, updated_at) VALUES
('cat-gov', 'Governance Policies', NULL, 'High-level governance and policy documents', 'PRESIDENT', NOW(), NOW()),
('cat-conflict', 'Conflict of Interest Policy', 'cat-gov', 'Policies related to conflict of interest management', 'PRESIDENT', NOW(), NOW()),
('cat-conduct', 'Code of Conduct Policy', 'cat-gov', 'Code of conduct and behavioral policies', 'PRESIDENT', NOW(), NOW()),
('cat-operational', 'Operational Procedures', NULL, 'Day-to-day operational procedures and guidelines', 'BOARD_MEMBER', NOW(), NOW()),
('cat-volunteer', 'Volunteer Development Program', 'cat-operational', 'Volunteer management and development procedures', 'BOARD_MEMBER', NOW(), NOW()),
('cat-staff', 'Staff & Contractor Policies', 'cat-operational', 'Policies for staff and contractor management', 'PRESIDENT', NOW(), NOW()),
('cat-financial', 'Financial Accountability', NULL, 'Financial policies and procedures', 'PRESIDENT', NOW(), NOW()),
('cat-forms', 'Forms & Templates', NULL, 'Fillable forms and document templates', 'BOARD_MEMBER', NOW(), NOW()),
('cat-conflict-form', 'Conflict of Interest Disclosure Form', 'cat-forms', 'Form for disclosing potential conflicts of interest', 'BOARD_MEMBER', NOW(), NOW()),
('cat-conduct-form', 'Code of Conduct Acknowledgement Form', 'cat-forms', 'Form for acknowledging code of conduct', 'BOARD_MEMBER', NOW(), NOW()),
('cat-volunteer-form', 'Volunteer Interest Form', 'cat-forms', 'Form for volunteer applications and interests', 'BOARD_MEMBER', NOW(), NOW()),
('cat-performance-form', 'Performance Review Forms', 'cat-forms', 'Forms for performance evaluations', 'PRESIDENT', NOW(), NOW()),
('cat-financial-form', 'Financial Authorization Forms', 'cat-forms', 'Forms for financial approvals and authorizations', 'PRESIDENT', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Create default admin user (password: admin123)
-- Note: In production, this should be changed immediately
INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at, updated_at) VALUES
('admin-user', 'admin@community-association.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', 'System', 'Administrator', 'ADMIN', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create default president user (password: president123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, active, created_at, updated_at) VALUES
('president-user', 'president@community-association.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8KzK', 'Community', 'President', 'PRESIDENT', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;