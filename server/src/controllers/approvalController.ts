import { Request, Response, NextFunction } from 'express';
import { PrismaClient, ApprovalStatus, DocumentStatus, UserRole } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const requestApproval = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { documentId, notes } = req.body;

    if (!documentId) {
      throw createError('Document ID is required.', 400);
    }

    // Check if document exists and user has permission to request approval
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { category: true }
    });

    if (!document) {
      throw createError('Document not found.', 404);
    }

    // Check if user can request approval for this document
    const canRequestApproval = req.user.role === 'ADMIN' || 
                              req.user.role === 'PRESIDENT' || 
                              req.user.role === 'BOARD_MEMBER' ||
                              document.authorId === req.user.id;

    if (!canRequestApproval) {
      throw createError('You do not have permission to request approval for this document.', 403);
    }

    // Check if there's already a pending approval request
    const existingRequest = await prisma.approvalRequest.findFirst({
      where: {
        documentId,
        status: 'PENDING'
      }
    });

    if (existingRequest) {
      throw createError('There is already a pending approval request for this document.', 409);
    }

    // Create approval request
    const approvalRequest = await prisma.approvalRequest.create({
      data: {
        documentId,
        requestedById: req.user.id,
        notes,
        status: 'PENDING'
      },
      include: {
        document: {
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
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Update document status to UNDER_REVIEW
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'UNDER_REVIEW' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'REQUEST_APPROVAL',
        entityType: 'APPROVAL_REQUEST',
        entityId: approvalRequest.id,
        details: { documentId, documentTitle: document.title },
        ipAddress: req.ip
      }
    });

    // TODO: Send email notification to approvers

    res.status(201).json({
      message: 'Approval request submitted successfully',
      approvalRequest
    });
  } catch (error) {
    next(error);
  }
};

export const getApprovalRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { page = 1, limit = 10, status, sortBy = 'requestedAt', sortOrder = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause based on user role
    const where: any = {};

    if (req.user.role === 'ADMIN' || req.user.role === 'PRESIDENT') {
      // Can see all approval requests
    } else if (req.user.role === 'BOARD_MEMBER') {
      // Can see requests for documents they can approve
      where.document = {
        category: {
          requiredApprovalRole: {
            in: ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER']
          }
        }
      };
    } else {
      // Can only see their own requests
      where.requestedById = req.user.id;
    }

    // Apply status filter
    if (status) {
      where.status = status;
    }

    const [approvalRequests, total] = await Promise.all([
      prisma.approvalRequest.findMany({
        where,
        include: {
          document: {
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
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          reviewer: {
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
      prisma.approvalRequest.count({ where })
    ]);

    res.json({
      approvalRequests,
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

export const getApprovalRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;

    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            category: true,
            versions: {
              orderBy: { versionNumber: 'desc' },
              take: 1
            }
          }
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!approvalRequest) {
      throw createError('Approval request not found.', 404);
    }

    // Check permissions
    const canView = req.user.role === 'ADMIN' || 
                   req.user.role === 'PRESIDENT' || 
                   req.user.role === 'BOARD_MEMBER' ||
                   approvalRequest.requestedById === req.user.id;

    if (!canView) {
      throw createError('You do not have permission to view this approval request.', 403);
    }

    res.json({ approvalRequest });
  } catch (error) {
    next(error);
  }
};

export const reviewApproval = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      throw createError('Status must be either APPROVED or REJECTED.', 400);
    }

    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        document: {
          include: {
            category: true
          }
        }
      }
    });

    if (!approvalRequest) {
      throw createError('Approval request not found.', 404);
    }

    if (approvalRequest.status !== 'PENDING') {
      throw createError('This approval request has already been reviewed.', 409);
    }

    // Check if user can review this approval request
    const canReview = req.user.role === 'ADMIN' || 
                     req.user.role === 'PRESIDENT' ||
                     (req.user.role === 'BOARD_MEMBER' && 
                      ['ADMIN', 'PRESIDENT', 'BOARD_MEMBER'].includes(approvalRequest.document.category.requiredApprovalRole));

    if (!canReview) {
      throw createError('You do not have permission to review this approval request.', 403);
    }

    // Update approval request
    const updatedApprovalRequest = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: status as ApprovalStatus,
        notes,
        reviewedById: req.user.id,
        reviewedAt: new Date()
      },
      include: {
        document: {
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
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Update document status based on approval decision
    if (status === 'APPROVED') {
      await prisma.document.update({
        where: { id: approvalRequest.documentId },
        data: {
          status: 'LIVE',
          approvedById: req.user.id,
          approvedAt: new Date()
        }
      });
    } else {
      await prisma.document.update({
        where: { id: approvalRequest.documentId },
        data: {
          status: 'PENDING'
        }
      });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: status === 'APPROVED' ? 'APPROVE_DOCUMENT' : 'REJECT_DOCUMENT',
        entityType: 'APPROVAL_REQUEST',
        entityId: id,
        details: { 
          documentId: approvalRequest.documentId, 
          documentTitle: approvalRequest.document.title,
          status,
          notes
        },
        ipAddress: req.ip
      }
    });

    // TODO: Send email notification to requester

    res.json({
      message: `Document ${status.toLowerCase()} successfully`,
      approvalRequest: updatedApprovalRequest
    });
  } catch (error) {
    next(error);
  }
};

export const cancelApprovalRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;

    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { id },
      include: {
        document: true
      }
    });

    if (!approvalRequest) {
      throw createError('Approval request not found.', 404);
    }

    if (approvalRequest.status !== 'PENDING') {
      throw createError('Only pending approval requests can be cancelled.', 409);
    }

    // Check if user can cancel this request
    const canCancel = req.user.role === 'ADMIN' || 
                     req.user.role === 'PRESIDENT' ||
                     approvalRequest.requestedById === req.user.id;

    if (!canCancel) {
      throw createError('You do not have permission to cancel this approval request.', 403);
    }

    // Update approval request
    await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        reviewedById: req.user.id,
        reviewedAt: new Date()
      }
    });

    // Update document status back to pending
    await prisma.document.update({
      where: { id: approvalRequest.documentId },
      data: {
        status: 'PENDING'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CANCEL_APPROVAL_REQUEST',
        entityType: 'APPROVAL_REQUEST',
        entityId: id,
        details: { 
          documentId: approvalRequest.documentId, 
          documentTitle: approvalRequest.document.title
        },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Approval request cancelled successfully' });
  } catch (error) {
    next(error);
  }
};