import { Body, Controller, Post, UseGuards, ValidationPipe, Req, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import { CreateSchoolAdminDto } from './dto/create-school-admin.dto';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';

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
}
