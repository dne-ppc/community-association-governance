import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can view all users
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to view users.', 403);
    }

    const { page = 1, limit = 10, role, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          active: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              authoredDocuments: true
            }
          }
        },
        orderBy: { [sortBy as string]: sortOrder },
        skip: offset,
        take: Number(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
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

export const getUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;

    // Users can view their own profile, admin and president can view any profile
    const canView = req.user.id === id || 
                   req.user.role === 'ADMIN' || 
                   req.user.role === 'PRESIDENT';

    if (!canView) {
      throw createError('You do not have permission to view this user profile.', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        _count: {
          select: {
            authoredDocuments: true,
            approvedDocuments: true
          }
        }
      }
    });

    if (!user) {
      throw createError('User not found.', 404);
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;
    const { firstName, lastName, email, role, active } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw createError('User not found.', 404);
    }

    // Check permissions
    const isOwnProfile = req.user.id === id;
    const isAdminOrPresident = req.user.role === 'ADMIN' || req.user.role === 'PRESIDENT';

    if (!isOwnProfile && !isAdminOrPresident) {
      throw createError('You do not have permission to update this user.', 403);
    }

    // Only admin and president can change roles and active status
    if ((role || typeof active === 'boolean') && !isAdminOrPresident) {
      throw createError('Only administrators can change user roles and status.', 403);
    }

    // Check if email is already taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });

      if (emailTaken) {
        throw createError('Email is already taken.', 409);
      }
    }

    const updateData: any = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (role && isAdminOrPresident) updateData.role = role as UserRole;
    if (typeof active === 'boolean' && isAdminOrPresident) updateData.active = active;

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        active: true,
        updatedAt: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_USER',
        entityType: 'USER',
        entityId: id,
        details: { 
          updatedFields: Object.keys(updateData),
          targetUserEmail: existingUser.email
        },
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can deactivate users
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to deactivate users.', 403);
    }

    const { id } = req.params;

    // Prevent self-deactivation
    if (req.user.id === id) {
      throw createError('You cannot deactivate your own account.', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw createError('User not found.', 404);
    }

    if (!user.active) {
      throw createError('User is already deactivated.', 409);
    }

    await prisma.user.update({
      where: { id },
      data: { active: false }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DEACTIVATE_USER',
        entityType: 'USER',
        entityId: id,
        details: { 
          targetUserEmail: user.email,
          targetUserName: `${user.firstName} ${user.lastName}`
        },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    next(error);
  }
};

export const activateUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can activate users
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to activate users.', 403);
    }

    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw createError('User not found.', 404);
    }

    if (user.active) {
      throw createError('User is already active.', 409);
    }

    await prisma.user.update({
      where: { id },
      data: { active: true }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'ACTIVATE_USER',
        entityType: 'USER',
        entityId: id,
        details: { 
          targetUserEmail: user.email,
          targetUserName: `${user.firstName} ${user.lastName}`
        },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'User activated successfully' });
  } catch (error) {
    next(error);
  }
};

export const getUserActivity = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    const { id } = req.params;
    const { page = 1, limit = 20, action, entityType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // Check permissions
    const canView = req.user.id === id || 
                   req.user.role === 'ADMIN' || 
                   req.user.role === 'PRESIDENT';

    if (!canView) {
      throw createError('You do not have permission to view this user activity.', 403);
    }

    // Build where clause
    const where: any = { userId: id };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: offset,
        take: Number(limit)
      }),
      prisma.activityLog.count({ where })
    ]);

    res.json({
      activities,
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