import { Request, Response, NextFunction } from 'express';
import { PrismaClient, DocumentStatus, UserRole } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { marked } from 'marked';
import { diffLines } from 'diff';

const prisma = new PrismaClient();

// Helper function to generate slug
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

// Helper function to check document access
const checkDocumentAccess = async (userId: string, userRole: UserRole, documentId: string) => {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { category: true }
  });

  if (!document) {
    throw createError('Document not found.', 404);
  }

  // Admin and President can access all documents
  if (userRole === 'ADMIN' || userRole === 'PRESIDENT') {
    return document;
  }

  // Check if document is public
  if (document.isPublic && document.status === 'LIVE') {
    return document;
  }

  // Check if user is the author
  if (document.authorId === userId) {
    return document;
  }

  // Board members can view all documents
  if (userRole === 'BOARD_MEMBER') {
    return document;
  }

  // Committee members can view documents in their categories
  if (userRole === 'COMMITTEE_MEMBER') {
    // For now, allow access to all documents - can be refined based on category assignments
    return document;
  }

  // Volunteers can only view live, public documents
  if (userRole === 'VOLUNTEER' && document.isPublic && document.status === 'LIVE') {
    return document;
  }

  throw createError('Access denied.', 403);
};

export const createDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { title, categoryId, contentMarkdown, isPublic = false, formFields = [] } = req.body;

    if (!title || !categoryId || !contentMarkdown) {
      throw createError('Title, category, and content are required.', 400);
    }

    // Generate unique slug
    let slug = generateSlug(title);
    let counter = 1;
    while (await prisma.document.findUnique({ where: { slug } })) {
      slug = `${generateSlug(title)}-${counter}`;
      counter++;
    }

    // Create document
    const document = await prisma.document.create({
      data: {
        title,
        slug,
        categoryId,
        contentMarkdown,
        isPublic,
        authorId: req.user.id,
        hasFillableFields: formFields.length > 0
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        category: true
      }
    });

    // Create form fields if provided
    if (formFields.length > 0) {
      await prisma.formField.createMany({
        data: formFields.map((field: any, index: number) => ({
          documentId: document.id,
          fieldName: field.fieldName,
          fieldType: field.fieldType,
          position: index,
          required: field.required || false,
          placeholderText: field.placeholderText,
          options: field.options ? JSON.stringify(field.options) : null
        }))
      });
    }

    // Create initial version
    await prisma.documentVersion.create({
      data: {
        documentId: document.id,
        versionNumber: 1,
        contentMarkdown,
        authorId: req.user.id,
        changeDescription: 'Initial version'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: document.id,
        details: { title, categoryId },
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Document created successfully',
      document
    });
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { page = 1, limit = 10, category, status, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause based on user role and filters
    const where: any = {};

    if (req.user) {
      // Authenticated users can see more documents based on their role
      if (req.user.role === 'ADMIN' || req.user.role === 'PRESIDENT' || req.user.role === 'BOARD_MEMBER') {
        // Can see all documents
      } else if (req.user.role === 'COMMITTEE_MEMBER') {
        // Can see documents they authored or public live documents
        where.OR = [
          { authorId: req.user.id },
          { isPublic: true, status: 'LIVE' }
        ];
      } else {
        // Volunteers can only see public live documents
        where.isPublic = true;
        where.status = 'LIVE';
      }
    } else {
      // Public users can only see public live documents
      where.isPublic = true;
      where.status = 'LIVE';
    }

    // Apply filters
    if (category) {
      where.categoryId = category;
    }
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { contentMarkdown: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [documents, total] = await Promise.all([
      prisma.document.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          category: true,
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: offset,
        take: Number(limit)
      }),
      prisma.document.count({ where })
    ]);

    res.json({
      documents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const document = await checkDocumentAccess(
      req.user?.id || '',
      req.user?.role || 'PUBLIC',
      id
    );

    const documentWithDetails = await prisma.document.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        category: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 10
        },
        formFields: {
          orderBy: { position: 'asc' }
        }
      }
    });

    if (!documentWithDetails) {
      throw createError('Document not found.', 404);
    }

    // Log view activity
    if (req.user) {
      await prisma.activityLog.create({
        data: {
          userId: req.user.id,
          action: 'VIEW_DOCUMENT',
          entityType: 'DOCUMENT',
          entityId: id,
          ipAddress: req.ip
        }
      });
    }

    res.json({ document: documentWithDetails });
  } catch (error) {
    next(error);
  }
};

export const updateDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;
    const { title, contentMarkdown, isPublic, formFields, changeDescription } = req.body;

    // Check if user can edit this document
    const existingDocument = await prisma.document.findUnique({
      where: { id },
      include: { versions: { orderBy: { versionNumber: 'desc' }, take: 1 } }
    });

    if (!existingDocument) {
      throw createError('Document not found.', 404);
    }

    // Check permissions
    const canEdit = req.user.role === 'ADMIN' || 
                   req.user.role === 'PRESIDENT' || 
                   req.user.role === 'BOARD_MEMBER' ||
                   existingDocument.authorId === req.user.id;

    if (!canEdit) {
      throw createError('You do not have permission to edit this document.', 403);
    }

    // Calculate diff if content changed
    let contentDiff = null;
    if (contentMarkdown && contentMarkdown !== existingDocument.contentMarkdown) {
      const oldLines = existingDocument.contentMarkdown.split('\n');
      const newLines = contentMarkdown.split('\n');
      const diff = diffLines(oldLines, newLines);
      contentDiff = JSON.stringify(diff);
    }

    // Update document
    const updateData: any = {};
    if (title) updateData.title = title;
    if (contentMarkdown) updateData.contentMarkdown = contentMarkdown;
    if (typeof isPublic === 'boolean') updateData.isPublic = isPublic;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        category: true
      }
    });

    // Create new version if content changed
    if (contentMarkdown && contentMarkdown !== existingDocument.contentMarkdown) {
      const latestVersion = existingDocument.versions[0];
      const newVersionNumber = latestVersion ? latestVersion.versionNumber + 1 : 1;

      await prisma.documentVersion.create({
        data: {
          documentId: id,
          versionNumber: newVersionNumber,
          contentMarkdown,
          authorId: req.user.id,
          changeDescription: changeDescription || 'Document updated',
          contentDiff
        }
      });
    }

    // Update form fields if provided
    if (formFields) {
      // Delete existing form fields
      await prisma.formField.deleteMany({
        where: { documentId: id }
      });

      // Create new form fields
      if (formFields.length > 0) {
        await prisma.formField.createMany({
          data: formFields.map((field: any, index: number) => ({
            documentId: id,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            position: index,
            required: field.required || false,
            placeholderText: field.placeholderText,
            options: field.options ? JSON.stringify(field.options) : null
          }))
        });

        // Update hasFillableFields flag
        await prisma.document.update({
          where: { id },
          data: { hasFillableFields: true }
        });
      } else {
        await prisma.document.update({
          where: { id },
          data: { hasFillableFields: false }
        });
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: id,
        details: { title, hasContentChange: !!contentMarkdown },
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Document updated successfully',
      document
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      throw createError('Document not found.', 404);
    }

    // Check permissions - only admin, president, or author can delete
    const canDelete = req.user.role === 'ADMIN' || 
                     req.user.role === 'PRESIDENT' || 
                     document.authorId === req.user.id;

    if (!canDelete) {
      throw createError('You do not have permission to delete this document.', 403);
    }

    // Soft delete by archiving
    await prisma.document.update({
      where: { id },
      data: { status: 'ARCHIVED' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_DOCUMENT',
        entityType: 'DOCUMENT',
        entityId: id,
        details: { title: document.title },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getDocumentVersions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check document access
    await checkDocumentAccess(
      req.user?.id || '',
      req.user?.role || 'PUBLIC',
      id
    );

    const versions = await prisma.documentVersion.findMany({
      where: { documentId: id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { versionNumber: 'desc' }
    });

    res.json({ versions });
  } catch (error) {
    next(error);
  }
};

export const getDocumentDiff = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { fromVersion, toVersion } = req.query;

    if (!fromVersion || !toVersion) {
      throw createError('Both fromVersion and toVersion are required.', 400);
    }

    // Check document access
    await checkDocumentAccess(
      req.user?.id || '',
      req.user?.role || 'PUBLIC',
      id
    );

    const [fromVer, toVer] = await Promise.all([
      prisma.documentVersion.findFirst({
        where: {
          documentId: id,
          versionNumber: Number(fromVersion)
        }
      }),
      prisma.documentVersion.findFirst({
        where: {
          documentId: id,
          versionNumber: Number(toVersion)
        }
      })
    ]);

    if (!fromVer || !toVer) {
      throw createError('One or both versions not found.', 404);
    }

    const fromLines = fromVer.contentMarkdown.split('\n');
    const toLines = toVer.contentMarkdown.split('\n');
    const diff = diffLines(fromLines, toLines);

    res.json({
      fromVersion: Number(fromVersion),
      toVersion: Number(toVersion),
      diff
    });
  } catch (error) {
    next(error);
  }
};