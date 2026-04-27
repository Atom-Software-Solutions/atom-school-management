import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GuardiansController } from './guardians.controller';
import { GuardiansService } from './guardians.service';

@Module({
    controllers: [GuardiansController],
    providers: [GuardiansService, PrismaService],
    exports: [GuardiansService],
})
export class GuardiansModule { }
