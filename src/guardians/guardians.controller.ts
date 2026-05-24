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
import { AddGuardianToStudentDto, CreateGuardianDto, UpdateGuardianDto } from './dto/guardian.dto';
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
        try {
            return await this.guardiansService.listAll(schoolId, adminUserId);
        } catch (err) {
            console.error('List Guardians Error:', err);
            throw new BadRequestException('Failed to fetch guardians.');
        }
    }

    @Get(':id')
    async getOne(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.getOne(id, adminUserId);
        } catch (err) {
            console.error('Get Guardian Error:', err);
            throw new BadRequestException('Failed to fetch guardian.');
        }
    }

    @Post()
    async create(
        @Body() body: CreateGuardianDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.create(body, adminUserId);
        } catch (err) {
            console.error('Create Guardian Error:', err);
            throw new BadRequestException('Failed to create guardian. Please check your input and try again.');
        }
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() body: UpdateGuardianDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.update(id, body, adminUserId);
        } catch (err) {
            console.error('Update Guardian Error:', err);
            throw new BadRequestException('Failed to update guardian. Please check your input and try again.');
        }
    }

    @Delete(':id')
    async delete(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.delete(id, adminUserId);
        } catch (err) {
            console.error('Delete Guardian Error:', err);
            throw new BadRequestException('Failed to delete guardian.');
        }
    }

    @Post(':id/guardians')
    async addGuardian(
        @Param('id') id: string,
        @Body() body: AddGuardianToStudentDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.addGuardianToStudent(id, adminUserId, body);
        } catch (err) {
            console.error('Add Guardian To Student Error:', err);
            throw new BadRequestException('Failed to add guardian to student. Please check your input and try again.');
        }
    }

    @Patch(':studentId/guardians/:guardianId/set-primary')
    async setPrimaryGuardian(
        @Param('studentId') studentId: string,
        @Param('guardianId') guardianId: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        try {
            return await this.guardiansService.setPrimaryGuardian(studentId, guardianId, adminUserId);
        } catch (err) {
            console.error('Set Primary Guardian Error:', err);
            throw new BadRequestException('Failed to set primary guardian.');
        }
    }
}
