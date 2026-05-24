import { Body, Controller, Get, Post, Query, Request, UseGuards, ValidationPipe } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { AdminService } from './admin.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';

@Controller('admins')
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Post('school')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async createSchoolAdmin(
        @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
        dto: CreateSchoolAdminDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.adminService.createSchoolAdmin(dto, req.user);
    }

    @Get('school')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN', 'SCHOOL_ADMIN')
    async listSchoolAdmins(@Request() req: AuthenticatedRequest, @Query('schoolId') schoolId?: string) {
        return this.adminService.listSchoolAdmins(req.user, schoolId);
    }

    @Get('super')
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('SUPER_ADMIN')
    async listSuperAdmins(@Request() req: AuthenticatedRequest) {
        return this.adminService.listSuperAdmins(req.user);
    }
}
