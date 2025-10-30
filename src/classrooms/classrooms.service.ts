import { Injectable, ForbiddenException, NotImplementedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) throw new ForbiddenException('Insufficient permissions for this school');
  }

  async list(schoolId: string, adminUserId: string) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    // Implementation will be added later
    throw new NotImplementedException('Listing classrooms not implemented yet');
  }

  async create(schoolId: string, adminUserId: string, data: { name: string }) {
    await this.assertIsAdminOfSchool(schoolId, adminUserId);
    // Implementation will be added later
    throw new NotImplementedException('Creating classroom not implemented yet');
  }
}


