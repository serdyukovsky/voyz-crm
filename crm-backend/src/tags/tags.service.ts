import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/services/prisma.service';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOrCreate(name: string, color?: string) {
    const existing = await this.prisma.tag.findUnique({
      where: { name },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.tag.create({
      data: {
        name,
        color: color || '#6B7280',
      },
    });
  }

  async updateColor(name: string, color: string) {
    return this.prisma.tag.update({
      where: { name },
      data: { color },
    });
  }

  async delete(name: string) {
    return this.prisma.tag.delete({
      where: { name },
    });
  }
}
