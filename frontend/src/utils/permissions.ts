export type Role = 'viewer' | 'editor' | 'owner';

export interface PermissionContext {
  userId: string;
  role: Role;
}

export const canDraw = (p: PermissionContext) =>
  p.role === 'editor' || p.role === 'owner';

export const canEditStroke = (p: PermissionContext, strokeUserId: string) =>
  p.role === 'owner' || p.userId === strokeUserId;

export const canExport = (p: PermissionContext) =>
  p.role === 'editor' || p.role === 'owner';
