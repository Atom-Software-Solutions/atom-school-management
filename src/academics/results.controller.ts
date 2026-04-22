import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { ResultsService } from './results.service';
import { ReportCardsService } from './report-cards.service'; // Make sure this service exists

@Controller('schools/:schoolId/results')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class ResultsController {
  constructor(
    private readonly resultsService: ResultsService,
    private readonly reportCardsService: ReportCardsService,
  ) {}

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

  @Get('by-classroom')
  async getResultsByClassroom(
    @Param('schoolId') schoolId: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Query('definitionId') definitionId: string,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.resultsService.getResultsByClassroom(
      schoolId,
      req.user.id,
      yearId,
      termId,
      definitionId,
    );
  }

  @Get('report-cards/by-identity')
  async getReportCardByIdentity(
    @Param('schoolId') schoolId: string,
    @Query('identity') identity: string,
    @Query('yearId') yearId: string,
    @Query('termId') termId: string,
    @Req() req: any,
  ) {
    if (!req.user) {
      throw new ForbiddenException('Authentication required');
    }
    return this.reportCardsService.getReportCardByIdentity(
      schoolId,
      req.user.id,
      yearId,
      termId,
      identity,
    );
  }
}
