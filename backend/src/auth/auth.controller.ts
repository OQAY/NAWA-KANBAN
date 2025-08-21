import { Controller, Post, Get, Body, UseGuards, Request, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
    };
  }

  @Post('create-first-admin')
  @ApiOperation({ summary: 'Create first admin (only if no admin exists)' })
  @ApiResponse({ status: 200, description: 'First admin created successfully' })
  @ApiResponse({ status: 409, description: 'Admin already exists' })
  async createFirstAdmin(@Body() createAdminDto: { email: string; password: string; name: string }) {
    return this.authService.createFirstAdmin(createAdminDto);
  }

  @Patch('promote-to-admin/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Promote user to admin (admin only)' })
  @ApiResponse({ status: 200, description: 'User promoted to admin' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin access required' })
  async promoteToAdmin(@Request() req, @Param('userId') userId: string) {
    return this.authService.promoteToAdmin(req.user.id, userId);
  }
}