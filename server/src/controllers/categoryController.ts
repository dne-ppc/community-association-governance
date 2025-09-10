import { Request, Response, NextFunction } from 'express';
import { PrismaClient, UserRole } from '@prisma/client';
import { createError } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getCategories = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.documentCategory.findMany({
      include: {
        parent: true,
        children: {
          include: {
            children: true
          }
        },
        _count: {
          select: {
            documents: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Build hierarchical structure
    const buildHierarchy = (categories: any[], parentId: string | null = null): any[] => {
      return categories
        .filter(cat => cat.parentId === parentId)
        .map(cat => ({
          ...cat,
          children: buildHierarchy(categories, cat.id)
        }));
    };

    const hierarchicalCategories = buildHierarchy(categories);

    res.json({ categories: hierarchicalCategories });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const category = await prisma.documentCategory.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        documents: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!category) {
      throw createError('Category not found.', 404);
    }

    res.json({ category });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can create categories
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to create categories.', 403);
    }

    const { name, parentId, description, requiredApprovalRole = 'PRESIDENT' } = req.body;

    if (!name) {
      throw createError('Category name is required.', 400);
    }

    // Check if parent category exists
    if (parentId) {
      const parentCategory = await prisma.documentCategory.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        throw createError('Parent category not found.', 404);
      }
    }

    const category = await prisma.documentCategory.create({
      data: {
        name,
        parentId,
        description,
        requiredApprovalRole: requiredApprovalRole as UserRole
      },
      include: {
        parent: true,
        children: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'CREATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: category.id,
        details: { name, parentId },
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can update categories
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to update categories.', 403);
    }

    const { id } = req.params;
    const { name, parentId, description, requiredApprovalRole } = req.body;

    const existingCategory = await prisma.documentCategory.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      throw createError('Category not found.', 404);
    }

    // Prevent circular references
    if (parentId === id) {
      throw createError('Category cannot be its own parent.', 400);
    }

    // Check if parent category exists
    if (parentId) {
      const parentCategory = await prisma.documentCategory.findUnique({
        where: { id: parentId }
      });

      if (!parentCategory) {
        throw createError('Parent category not found.', 404);
      }

      // Check for circular reference in hierarchy
      const checkCircularReference = async (categoryId: string, targetId: string): Promise<boolean> => {
        const category = await prisma.documentCategory.findUnique({
          where: { id: categoryId }
        });

        if (!category || !category.parentId) {
          return false;
        }

        if (category.parentId === targetId) {
          return true;
        }

        return checkCircularReference(category.parentId, targetId);
      };

      if (await checkCircularReference(parentId, id)) {
        throw createError('Cannot set parent: would create circular reference.', 400);
      }
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (description !== undefined) updateData.description = description;
    if (requiredApprovalRole) updateData.requiredApprovalRole = requiredApprovalRole as UserRole;

    const category = await prisma.documentCategory.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        children: true
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'UPDATE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        details: { name, parentId },
        ipAddress: req.ip
      }
    });

    res.json({
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw createError('Authentication required.', 401);
    }

    // Only admin and president can delete categories
    if (req.user.role !== 'ADMIN' && req.user.role !== 'PRESIDENT') {
      throw createError('Insufficient permissions to delete categories.', 403);
    }

    const { id } = req.params;

    const category = await prisma.documentCategory.findUnique({
      where: { id },
      include: {
        children: true,
        documents: true
      }
    });

    if (!category) {
      throw createError('Category not found.', 404);
    }

    // Check if category has children
    if (category.children.length > 0) {
      throw createError('Cannot delete category with subcategories. Please move or delete subcategories first.', 400);
    }

    // Check if category has documents
    if (category.documents.length > 0) {
      throw createError('Cannot delete category with documents. Please move or delete documents first.', 400);
    }

    await prisma.documentCategory.delete({
      where: { id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        userId: req.user.id,
        action: 'DELETE_CATEGORY',
        entityType: 'CATEGORY',
        entityId: id,
        details: { name: category.name },
        ipAddress: req.ip
      }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};