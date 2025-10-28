import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createSchoolDto: CreateSchoolDto) {
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
        email: createSchoolDto.email,
        phone: createSchoolDto.phone,
        address: createSchoolDto.address,
        logo_url: createSchoolDto.logoUrl,
        currency: createSchoolDto.currency || 'UGX',
        time_zone: createSchoolDto.timeZone || 'Africa/Kampala',
      },
    });

    return school;
  }

  async findAll() {
    return this.prisma.school.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findFirst({
      where: { id, deleted_at: null },
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    return school;
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
    if (updateSchoolDto.currency) updateData.currency = updateSchoolDto.currency;
    if (updateSchoolDto.timeZone) updateData.time_zone = updateSchoolDto.timeZone;
    if (updateSchoolDto.isActive !== undefined)
      updateData.is_active = updateSchoolDto.isActive;

    return this.prisma.school.update({
      where: { id },
      data: updateData,
    });
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
}

