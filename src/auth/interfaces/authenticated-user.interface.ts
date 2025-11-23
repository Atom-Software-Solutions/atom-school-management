export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  school_id?: string | null; // Tenant identifier (null for SUPER_ADMIN, undefined if not set)
  phone: string | null;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}
