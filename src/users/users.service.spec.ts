import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('UsersService', () => {
  let service: UsersService;
  let emailService: { sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    emailService = {
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            schoolAdmin: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            session: {
              updateMany: jest.fn(),
            },
            $connect: jest.fn(),
            $disconnect: jest.fn(),
          },
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should trigger a reset email to the user instead of setting a new password directly', async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn((args) => {
          if (args.where.id === 'actor-user') {
            return Promise.resolve({
              id: 'actor-user',
              role: 'SCHOOL_ADMIN',
            });
          }

          if (args.where.id === 'target-user') {
            return Promise.resolve({
              id: 'target-user',
              email: 'target-user@example.com',
              first_name: 'Jane',
              password_hash: '$2b$10$Qm3m9l5Axr4D80QwL3rW1OHbUrG2f0gvaP6U7nq1hpyzK0O5s6XkS',
              role: 'SCHOOL_ADMIN',
              school_id: 'school-1',
            });
          }

          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      schoolAdmin: {
        findFirst: jest.fn().mockResolvedValue({ user_id: 'actor-user', school_id: 'school-1' }),
      },
      session: {
        updateMany: jest.fn().mockResolvedValue({}),
      },
    };

    (service as any).prisma = mockPrisma;

    await expect(
      service.resetUserPassword('target-user', 'NewPassword123!', 'actor-user', 'school-1'),
    ).resolves.toEqual({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });

    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'target-user' },
        data: expect.objectContaining({
          password_reset_token: expect.any(String),
          password_reset_expires: expect.any(Date),
        }),
      }),
    );
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
      'target-user@example.com',
      'Jane',
      expect.any(String),
    );
    expect(mockPrisma.session.updateMany).not.toHaveBeenCalled();
  });
});
