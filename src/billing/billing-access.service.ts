import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

/** Shared tenant check for every billing endpoint. */
@Injectable()
export class BillingAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** SUPER_ADMIN may read any school; SCHOOL_ADMIN only schools they administer. */
  async assertCanRead(schoolId: string, user: AuthenticatedUser | undefined) {
    if (!user) throw new ForbiddenException('Authentication required');
    if (user.role === 'SUPER_ADMIN') return;
    await this.assertSchoolAdmin(schoolId, user.id);
  }

  /** Writes are restricted to admins of the school (SUPER_ADMIN is read-only in phase 1). */
  async assertCanWrite(schoolId: string, user: AuthenticatedUser | undefined) {
    if (!user) throw new ForbiddenException('Authentication required');
    await this.assertSchoolAdmin(schoolId, user.id);
  }

  private async assertSchoolAdmin(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId.trim(), user_id: userId } },
      select: { school_id: true },
    });
    if (!rel) throw new ForbiddenException('Insufficient permissions for this school');
  }
}
