import { Role } from '../../../generated/prisma';

export interface UserResponse {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  phone: string | null;
  school_id: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserWithPassword extends UserResponse {
  password_hash: string;
  last_login: Date | null;
}

