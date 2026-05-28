import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createSchoolDto: CreateSchoolDto, creatorUserId?: string) {
    // If request originated from an authenticated user, enforce verification for SCHOOL_ADMINs
    if (creatorUserId) {
      const creator = await this.prisma.user.findUnique({
        where: { id: creatorUserId },
      });
      if (
        creator &&
        creator.role === 'SCHOOL_ADMIN' &&
        !creator.email_verified
      ) {
        throw new ForbiddenException(
          'Email must be verified before creating a school',
        );
      }
    }

    // Check if school with code already exists
    const existingSchool = await this.prisma.school.findUnique({
      where: { code: createSchoolDto.code },
    });

    if (existingSchool) {
      throw new ConflictException('School with this code already exists');
    }

    // Check if email already exists
    const existingSchoolByEmail = await this.prisma.school.findFirst({
      where: { email: createSchoolDto.email },
    });

    if (existingSchoolByEmail) {
      throw new ConflictException('School with this email already exists');
    }

    // Create the school
    const school = await this.prisma.school.create({
      data: {
        code: createSchoolDto.code,
        name: createSchoolDto.name,
        domain: createSchoolDto.domain,
        email: createSchoolDto.email,
        phone: createSchoolDto.phone,
        address: createSchoolDto.address,
        logo_url: createSchoolDto.logoUrl,
        institution_type: createSchoolDto.institutionType,
        currency: createSchoolDto.currency || 'UGX',
        time_zone: createSchoolDto.timeZone || 'Africa/Kampala',
        motto: createSchoolDto.motto,
      },
    });

    // If created by a user (e.g., SCHOOL_ADMIN self-service), create SchoolAdmin relationship
    if (creatorUserId) {
      await this.prisma.schoolAdmin
        .upsert({
          where: {
            school_id_user_id: { school_id: school.id, user_id: creatorUserId },
          },
          create: {
            school_id: school.id,
            user_id: creatorUserId,
            is_super_admin: true,
          },
          update: {},
        })
        .catch(() => undefined);
    }

    // Return with admins
    return this.prisma.school.findUnique({
      where: { id: school.id },
      include: {
        admins: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.school.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
      include: {
        admins: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, deleted_at: null },
      include: {
        admins: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    return school;
  }

  private async assertIsAdminOfSchool(schoolId: string, userId: string) {
    const rel = await this.prisma.schoolAdmin.findUnique({
      where: { school_id_user_id: { school_id: schoolId, user_id: userId } },
    });
    if (!rel) {
      throw new ForbiddenException('Insufficient permissions for this school');
    }
  }

  async findIfAdmin(id: string, userId: string) {
    await this.assertIsAdminOfSchool(id, userId);
    return this.findOne(id);
  }

  async update(id: string, updateSchoolDto: UpdateSchoolDto) {
    await this.findOne(id); // Check if school exists

    const updateData: any = {};
    if (updateSchoolDto.name) updateData.name = updateSchoolDto.name;
    if (updateSchoolDto.email) updateData.email = updateSchoolDto.email;
    if (updateSchoolDto.phone) updateData.phone = updateSchoolDto.phone;
    if (updateSchoolDto.address !== undefined)
      updateData.address = updateSchoolDto.address;
    if (updateSchoolDto.logoUrl !== undefined)
      updateData.logo_url = updateSchoolDto.logoUrl;
    if (updateSchoolDto.currency)
      updateData.currency = updateSchoolDto.currency;
    if (updateSchoolDto.timeZone)
      updateData.time_zone = updateSchoolDto.timeZone;
    if (updateSchoolDto.isActive !== undefined)
      updateData.is_active = updateSchoolDto.isActive;
    if (updateSchoolDto.motto !== undefined)
      updateData.motto = updateSchoolDto.motto;
    if (updateSchoolDto.institutionType !== undefined)
      updateData.institution_type = updateSchoolDto.institutionType;

    return this.prisma.school.update({
      where: { id },
      data: updateData,
      include: {
        admins: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                first_name: true,
                last_name: true,
                phone: true,
              },
            },
          },
        },
      },
    });
  }

  async updateIfAdmin(
    id: string,
    userId: string,
    updateSchoolDto: UpdateSchoolDto,
  ) {
    await this.assertIsAdminOfSchool(id, userId);
    return this.update(id, updateSchoolDto);
  }

  async remove(id: string) {
    const school = await this.findOne(id); // Check if school exists

    // Soft delete by setting is_active to false and deleted_at timestamp
    await this.prisma.school.update({
      where: { id },
      data: {
        is_active: false,
        deleted_at: new Date(),
      },
    });

    return { message: 'School soft-deleted successfully' };
  }

  async getSettings(id: string) {
    const school = await this.findOne(id); // Check if school exists

    return {
      currency: school.currency,
      timeZone: school.time_zone,
      customSettings: school.settings || {},
    };
  }

  async getSettingsIfAdmin(id: string, userId: string) {
    await this.assertIsAdminOfSchool(id, userId);
    return this.getSettings(id);
  }

  async updateSettings(id: string, updateSettingsDto: UpdateSettingsDto) {
    await this.findOne(id); // Check if school exists

    const updateData: any = {};

    if (updateSettingsDto.currency) {
      updateData.currency = updateSettingsDto.currency;
    }
    if (updateSettingsDto.timeZone) {
      updateData.time_zone = updateSettingsDto.timeZone;
    }
    if (updateSettingsDto.customSettings !== undefined) {
      updateData.settings = updateSettingsDto.customSettings;
    }

    const updatedSchool = await this.prisma.school.update({
      where: { id },
      data: updateData,
    });

    return {
      currency: updatedSchool.currency,
      timeZone: updatedSchool.time_zone,
      customSettings: updatedSchool.settings || {},
    };
  }

  async updateSettingsIfAdmin(
    id: string,
    userId: string,
    updateSettingsDto: UpdateSettingsDto,
  ) {
    await this.assertIsAdminOfSchool(id, userId);
    return this.updateSettings(id, updateSettingsDto);
  }
}
