import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { GuardiansService } from './guardians.service';

@Controller('guardians')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class GuardiansController {
    constructor(private readonly guardiansService: GuardiansService) { }

    @Get()
    async listAll(
        @Query('schoolId') schoolId: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        if (!schoolId || typeof schoolId !== 'string' || schoolId.trim() === '') {
            throw new BadRequestException('Missing required query parameter: schoolId');
        }
        return this.guardiansService.listAll(schoolId, adminUserId);
    }

    @Get(':id')
    async getOne(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardiansService.getOne(id, adminUserId);
    }

    @Post()
    async create(
        @Body()
        body: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            students: { id: string; relation?: string }[];
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        if (!Array.isArray(body.students) || body.students.length === 0) {
            throw new BadRequestException('students array must be non-empty');
        }
        return this.guardiansService.create(body, adminUserId);
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body()
        body: {
            firstName?: string;
            lastName?: string;
            email?: string;
            phone?: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardiansService.update(id, body, adminUserId);
    }

    @Delete(':id')
    async archive(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardiansService.archive(id, adminUserId);
    }

    @Post('/students/:id/guardians')
    async addGuardian(
        @Param('id') id: string,
        @Body()
        body: {
            firstName: string;
            lastName: string;
            email?: string;
            phone?: string;
            relation?: string;
        },
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardiansService.addGuardianToStudent(id, adminUserId, body);
    }
}
