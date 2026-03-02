import { Controller, ForbiddenException, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';

@Controller('schools/:schoolId/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ResultsController {
    constructor(private readonly resultsService: ResultsService) { }

    @Get('by-identity')
    async getStudentResultsByIdentity(
        @Param('schoolId') schoolId: string,
        @Query('identity') identity: string,
        @Query('yearId') yearId: string,
        @Query('termId') termId: string,
        @Req() req: any,
    ) {
        if (!req.user) {
            throw new ForbiddenException('Authentication required');
        }
        return this.resultsService.getStudentResultsByIdentity(
            schoolId,
            req.user.id,
            yearId,
            termId,
            identity,
        );
    }
}
