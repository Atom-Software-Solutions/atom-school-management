export interface AuthenticatedUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string | null;
  school_id: string | null;
  is_active: boolean;
  last_login: Date | null;
  created_at: Date;
  updated_at: Date;
}

