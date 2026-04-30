import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Request,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from '../common/middleware/tenant.middleware';
import { BulkSendGuardianMessagesDto } from './dto/bulk-send-guardian-messages.dto';
import { SendGuardianMessageDto } from './dto/send-guardian-message.dto';
import { GuardianMessagesService } from './guardian-messages.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SCHOOL_ADMIN')
export class GuardianMessagesController {
    constructor(private readonly guardianMessagesService: GuardianMessagesService) { }

    @Post('guardians/:guardianId/messages')
    @UsePipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            stopAtFirstError: false,
        }),
    )
    sendToGuardian(
        @Param('guardianId') guardianId: string,
        @Body() body: SendGuardianMessageDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardianMessagesService.sendMessageToGuardian(guardianId, adminUserId, body);
    }

    @Post('students/:studentId/guardians/messages')
    @UsePipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            stopAtFirstError: false,
        }),
    )
    sendToStudentGuardians(
        @Param('studentId') studentId: string,
        @Body() body: SendGuardianMessageDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardianMessagesService.sendMessageToStudentGuardians(studentId, adminUserId, body);
    }

    @Post('guardians/bulk-messages')
    @UsePipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
            stopAtFirstError: false,
        }),
    )
    bulkSend(
        @Body() body: BulkSendGuardianMessagesDto,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardianMessagesService.bulkSendMessages(body, adminUserId);
    }

    @Get('guardians/:guardianId/messages')
    listForGuardian(
        @Param('guardianId') guardianId: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardianMessagesService.listMessagesForGuardian(guardianId, adminUserId);
    }

    @Get('guardians/:guardianId/messages/:messageId')
    getMessage(
        @Param('guardianId') guardianId: string,
        @Param('messageId') messageId: string,
        @Request() req: AuthenticatedRequest,
    ) {
        const adminUserId = req.user?.id as string;
        return this.guardianMessagesService.getMessage(guardianId, messageId, adminUserId);
    }
}
