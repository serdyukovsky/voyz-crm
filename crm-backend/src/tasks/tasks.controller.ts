import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Roles } from '@/auth/decorators/roles.decorator';
import { UserRole, TaskStatus } from '@prisma/client';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.tasksService.create(createTaskDto, user.userId || user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiResponse({ status: 200, description: 'List of tasks' })
  findAll(
    @Query('dealId') dealId?: string,
    @Query('contactId') contactId?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('status') status?: TaskStatus,
  ) {
    return this.tasksService.findAll({
      dealId,
      contactId,
      assignedToId,
      status,
    });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.userId || user.id);
  }

  @Get(':id/history')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.VIEWER)
  @ApiOperation({ summary: 'Get task history' })
  @ApiResponse({ status: 200, description: 'Task history' })
  getHistory(@Param('id') id: string) {
    return this.tasksService.getHistory(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  @ApiOperation({ summary: 'Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own tasks' })
  async remove(@Param('id') id: string, @CurrentUser() user: any) {
    const userId = user.userId || user.id;
    const userRole = user.role;
    
    // If user is MANAGER, check if they can delete this task (only own tasks)
    if (userRole === UserRole.MANAGER) {
      const task = await this.tasksService.findOne(id);
      // MANAGER can only delete tasks assigned to them or created by them
      if (task.assignedToId !== userId && task.createdById !== userId) {
        throw new ForbiddenException('You can only delete your own tasks');
      }
    }
    
    return this.tasksService.remove(id, userId);
  }
}

