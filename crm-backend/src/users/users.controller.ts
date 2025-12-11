import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RbacGuard } from '@/common/guards/rbac.guard';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/common/constants/permissions';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Create new user (Admin only)' })
  @ApiResponse({ status: 201, description: 'User created', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'List of users', type: [UserResponseDto] })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user', type: UserResponseDto })
  async getMe(@CurrentUser() currentUser: any) {
    const userId = currentUser.userId || currentUser.id;
    console.log('UsersController.getMe: Current user ID:', userId, 'User object:', currentUser);
    const user = await this.usersService.findOne(userId);
    console.log('UsersController.getMe: Returning user data:', user);
    return user;
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS_VIEW)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  @ApiResponse({ status: 200, description: 'Profile updated', type: UserResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  updateMe(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    const userId = currentUser.userId || currentUser.id;
    // Remove role and isActive from update - users can't change these
    const { role, isActive, ...profileUpdate } = updateUserDto;
    return this.usersService.update(userId, profileUpdate, currentUser);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Update user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User updated', type: UserResponseDto })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.update(id, updateUserDto, currentUser);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USERS_MANAGE)
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.remove(id, currentUser);
  }
}

