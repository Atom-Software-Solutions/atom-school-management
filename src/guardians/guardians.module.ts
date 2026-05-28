import { Module } from '@nestjs/common';
import { EmailModule } from '../email/email.module';
import { GuardianMessagesController } from './guardian-messages.controller';
import { GuardianMessagesService } from './guardian-messages.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

@Module({
    imports: [EmailModule],
    controllers: [GuardiansController, GuardianMessagesController],
    providers: [GuardiansService, GuardianMessagesService],
    exports: [GuardiansService, GuardianMessagesService],
})
export class GuardiansModule { }
