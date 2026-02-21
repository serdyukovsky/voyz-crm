import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  normalizeEmail,
  sanitizeTextFields,
  sanitizeOptionalTextFields,
} from '@/common/utils/normalization.utils';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    // Normalize email
    const normalizedEmail = normalizeEmail(createUserDto.email);
    if (!normalizedEmail) {
      throw new BadRequestException('Invalid email format');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await argon2.hash(createUserDto.password);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        firstName: sanitizeTextFields(createUserDto.firstName)!,
        lastName: sanitizeTextFields(createUserDto.lastName)!,
        phone: createUserDto.phone ? sanitizeOptionalTextFields(createUserDto.phone) : undefined,
        telegramUsername: createUserDto.telegramUsername ? sanitizeOptionalTextFields(createUserDto.telegramUsername) : undefined,
        role: createUserDto.role || UserRole.MANAGER,
        isActive: createUserDto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        phone: true,
        telegramUsername: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async getAvatar(id: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { avatar: true },
    });
    return user?.avatar || null;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        // avatar excluded from list — base64 data URLs bloat response (220KB+ per user)
        avatarColor: true,
        phone: true,
        telegramUsername: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        avatarColor: true,
        phone: true,
        telegramUsername: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        permissions: true,
      },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent users from changing their own role (only admin can)
    if (
      updateUserDto.role &&
      currentUser &&
      currentUser.userId === id &&
      currentUser.role !== UserRole.ADMIN
    ) {
      throw new ForbiddenException('You cannot change your own role');
    }

    // Normalize email if provided
    let normalizedEmail: string | undefined;
    if (updateUserDto.email !== undefined) {
      const normalized = normalizeEmail(updateUserDto.email);
      if (!normalized) {
        throw new BadRequestException('Invalid email format');
      }
      normalizedEmail = normalized;
    }

    // Check if email is being changed and if it's already taken
    if (normalizedEmail && normalizedEmail !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData: any = {};

    // Normalize and set fields
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail;
    if (updateUserDto.firstName !== undefined) {
      updateData.firstName = sanitizeTextFields(updateUserDto.firstName) || undefined;
    }
    if (updateUserDto.lastName !== undefined) {
      updateData.lastName = sanitizeTextFields(updateUserDto.lastName) || undefined;
    }
    if (updateUserDto.role !== undefined) updateData.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;
    if (updateUserDto.avatar !== undefined) {
      updateData.avatar = sanitizeOptionalTextFields(updateUserDto.avatar);
    }
    if (updateUserDto.avatarColor !== undefined) {
      updateData.avatarColor = updateUserDto.avatarColor || null;
    }
    if (updateUserDto.phone !== undefined) {
      updateData.phone = sanitizeOptionalTextFields(updateUserDto.phone) || undefined;
    }
    if (updateUserDto.telegramUsername !== undefined) {
      updateData.telegramUsername = sanitizeOptionalTextFields(updateUserDto.telegramUsername) || undefined;
    }

    // Hash password if provided
    if (updateUserDto.password) {
      updateData.password = await argon2.hash(updateUserDto.password);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        avatarColor: true,
        phone: true,
        telegramUsername: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string, currentUser?: any) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent users from deleting themselves
    if (currentUser && currentUser.userId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    // Delete all refresh tokens for this user
    await this.prisma.refreshToken.deleteMany({
      where: { userId: id },
    });

    return this.prisma.user.delete({
      where: { id },
    });
  }
}

