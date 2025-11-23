export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  school_id?: string; // Tenant identifier (null for SUPER_ADMIN)
  jti?: string;
}
