import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default categories
  const categories = [
    {
      id: 'cat-gov',
      name: 'Governance Policies',
      description: 'High-level governance and policy documents',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-conflict',
      name: 'Conflict of Interest Policy',
      parentId: 'cat-gov',
      description: 'Policies related to conflict of interest management',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-conduct',
      name: 'Code of Conduct Policy',
      parentId: 'cat-gov',
      description: 'Code of conduct and behavioral policies',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-operational',
      name: 'Operational Procedures',
      description: 'Day-to-day operational procedures and guidelines',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-volunteer',
      name: 'Volunteer Development Program',
      parentId: 'cat-operational',
      description: 'Volunteer management and development procedures',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-staff',
      name: 'Staff & Contractor Policies',
      parentId: 'cat-operational',
      description: 'Policies for staff and contractor management',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-financial',
      name: 'Financial Accountability',
      description: 'Financial policies and procedures',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-forms',
      name: 'Forms & Templates',
      description: 'Fillable forms and document templates',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-conflict-form',
      name: 'Conflict of Interest Disclosure Form',
      parentId: 'cat-forms',
      description: 'Form for disclosing potential conflicts of interest',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-conduct-form',
      name: 'Code of Conduct Acknowledgement Form',
      parentId: 'cat-forms',
      description: 'Form for acknowledging code of conduct',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-volunteer-form',
      name: 'Volunteer Interest Form',
      parentId: 'cat-forms',
      description: 'Form for volunteer applications and interests',
      requiredApprovalRole: 'BOARD_MEMBER' as UserRole
    },
    {
      id: 'cat-performance-form',
      name: 'Performance Review Forms',
      parentId: 'cat-forms',
      description: 'Forms for performance evaluations',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    },
    {
      id: 'cat-financial-form',
      name: 'Financial Authorization Forms',
      parentId: 'cat-forms',
      description: 'Forms for financial approvals and authorizations',
      requiredApprovalRole: 'PRESIDENT' as UserRole
    }
  ];

  for (const category of categories) {
    await prisma.documentCategory.upsert({
      where: { id: category.id },
      update: category,
      create: category
    });
  }

  console.log('✅ Categories created');

  // Create default users
  const adminPassword = await bcrypt.hash('admin123', 12);
  const presidentPassword = await bcrypt.hash('president123', 12);
  const boardPassword = await bcrypt.hash('board123', 12);

  const users = [
    {
      id: 'admin-user',
      email: 'admin@community-association.com',
      passwordHash: adminPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'ADMIN' as UserRole
    },
    {
      id: 'president-user',
      email: 'president@community-association.com',
      passwordHash: presidentPassword,
      firstName: 'Community',
      lastName: 'President',
      role: 'PRESIDENT' as UserRole
    },
    {
      id: 'board-user',
      email: 'board@community-association.com',
      passwordHash: boardPassword,
      firstName: 'Board',
      lastName: 'Member',
      role: 'BOARD_MEMBER' as UserRole
    }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: user,
      create: user
    });
  }

  console.log('✅ Users created');

  // Create sample documents
  const sampleDocuments = [
    {
      id: 'doc-conflict-policy',
      title: 'Conflict of Interest Policy',
      slug: 'conflict-of-interest-policy',
      categoryId: 'cat-conflict',
      contentMarkdown: `# Conflict of Interest Policy

## Purpose
This policy establishes guidelines for identifying, disclosing, and managing conflicts of interest within our community association.

## Definitions
A conflict of interest exists when a board member, officer, or key employee has a personal, financial, or other interest that could influence their judgment or actions in their official capacity.

## Disclosure Requirements
All board members and key employees must:
- Disclose any potential conflicts of interest
- Complete the Conflict of Interest Disclosure Form annually
- Update disclosures when circumstances change

## Management Procedures
When a conflict is identified:
1. The individual must recuse themselves from related discussions
2. The board will determine appropriate management measures
3. All decisions will be documented in meeting minutes

## Compliance
Failure to disclose conflicts of interest may result in disciplinary action, including removal from office.`,
      authorId: 'president-user',
      status: 'LIVE' as any,
      isPublic: true,
      hasFillableFields: true
    },
    {
      id: 'doc-conduct-policy',
      title: 'Code of Conduct Policy',
      slug: 'code-of-conduct-policy',
      categoryId: 'cat-conduct',
      contentMarkdown: `# Code of Conduct Policy

## Our Commitment
We are committed to maintaining the highest standards of ethical behavior and professional conduct in all our activities.

## Expected Behavior
All members, volunteers, and staff are expected to:
- Treat everyone with respect and dignity
- Act with integrity and honesty
- Maintain confidentiality when required
- Follow all applicable laws and regulations

## Prohibited Behavior
The following behaviors are strictly prohibited:
- Harassment or discrimination of any kind
- Use of association resources for personal gain
- Disclosure of confidential information
- Any form of retaliation against whistleblowers

## Reporting Violations
Violations of this code should be reported to the board president or through our anonymous reporting system.

## Enforcement
Violations will be investigated promptly and may result in disciplinary action up to and including termination of membership or employment.`,
      authorId: 'president-user',
      status: 'LIVE' as any,
      isPublic: true,
      hasFillableFields: false
    }
  ];

  for (const doc of sampleDocuments) {
    await prisma.document.upsert({
      where: { id: doc.id },
      update: doc,
      create: doc
    });

    // Create initial version
    await prisma.documentVersion.upsert({
      where: {
        documentId_versionNumber: {
          documentId: doc.id,
          versionNumber: 1
        }
      },
      update: {},
      create: {
        documentId: doc.id,
        versionNumber: 1,
        contentMarkdown: doc.contentMarkdown,
        authorId: doc.authorId,
        changeDescription: 'Initial version'
      }
    });
  }

  console.log('✅ Sample documents created');

  // Create sample form fields for the conflict of interest policy
  const formFields = [
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Full Name',
      fieldType: 'TEXT' as any,
      position: 0,
      required: true,
      placeholderText: 'Enter your full name'
    },
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Position/Title',
      fieldType: 'TEXT' as any,
      position: 1,
      required: true,
      placeholderText: 'Your position or title'
    },
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Date',
      fieldType: 'DATE' as any,
      position: 2,
      required: true
    },
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Conflict Description',
      fieldType: 'TEXTAREA' as any,
      position: 3,
      required: true,
      placeholderText: 'Describe any potential conflicts of interest'
    },
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Financial Interest',
      fieldType: 'RADIO' as any,
      position: 4,
      required: true,
      options: JSON.stringify(['Yes', 'No', 'Not Applicable'])
    },
    {
      documentId: 'doc-conflict-policy',
      fieldName: 'Signature',
      fieldType: 'SIGNATURE' as any,
      position: 5,
      required: true
    }
  ];

  for (const field of formFields) {
    await prisma.formField.upsert({
      where: {
        documentId_fieldName: {
          documentId: field.documentId,
          fieldName: field.fieldName
        }
      },
      update: field,
      create: field
    });
  }

  console.log('✅ Form fields created');

  console.log('🎉 Database seed completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('Admin: admin@community-association.com / admin123');
  console.log('President: president@community-association.com / president123');
  console.log('Board Member: board@community-association.com / board123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });