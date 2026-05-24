import { ForbiddenException } from '@nestjs/common';

export function assertIsSuperAdmin(user: any) {
    if (!user || user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Only Super Admins can perform this action.');
    }
}
