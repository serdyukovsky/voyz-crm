import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Tags')
@Controller('tags')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Получить все теги' })
  async findAll() {
    return this.tagsService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Создать тег' })
  async create(@Body() body: { name: string; color?: string }) {
    return this.tagsService.findOrCreate(body.name, body.color);
  }

  @Patch(':name/color')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Изменить цвет тега' })
  async updateColor(
    @Param('name') name: string,
    @Body() body: { color: string },
  ) {
    return this.tagsService.updateColor(decodeURIComponent(name), body.color);
  }

  @Delete(':name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Удалить тег' })
  async delete(@Param('name') name: string) {
    return this.tagsService.delete(decodeURIComponent(name));
  }
}
