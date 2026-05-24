import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('school/:schoolId')
    async getSchoolDashboard(@Param('schoolId') schoolId: string, @Request() req) {
        // Optionally, validate schoolId belongs to the admin's tenant
        return this.dashboardService.getSchoolDashboard(schoolId);
    }
}
