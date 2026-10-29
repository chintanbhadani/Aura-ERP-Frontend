import { Permission } from './constants';

export function hasPermission(permissions: any[] | undefined, permissionName: string): boolean {
  if (!permissions) return false;
  return permissions.some((permission: any) => {
    const name = typeof permission === 'string'
      ? permission
      : (typeof permission === 'number' ? String(permission) : permission?.name);
    return name?.toLowerCase() === permissionName?.toLowerCase();
  });
}

export function hasRole(data: any, roleName: string): boolean {
  if (!data || !Array.isArray(data)) return false;
  return data.some((item: any) => (item?.role?.name || item?.name) === roleName);
}

export const hasModulePermission = (
  permissionsDetails: any[],
  moduleName: string,
  requiredPermission: string = Permission.LIST
): boolean => {
  if (!permissionsDetails || !Array.isArray(permissionsDetails)) return false;

  const moduleFound = permissionsDetails.find(item => {
    const name = item?.moduleName || item?.name || item?.moduleTitle;
    return name?.toLowerCase() === moduleName?.toLowerCase();
  });

  if (!moduleFound) return false;

  const perms = moduleFound.permissions || moduleFound.permissionDetail;
  return hasPermission(perms, requiredPermission);
};

export const shouldShowMenuGroup = (
  permissionsDetails: any[],
  subMenus: string[]
): boolean => {
  if (!permissionsDetails || !Array.isArray(permissionsDetails)) return false;

  return subMenus?.some(subMenu => {
    const moduleFound = permissionsDetails.find(item => {
      const name = item?.moduleName || item?.name || item?.moduleTitle;
      return name?.toLowerCase() === subMenu?.toLowerCase();
    });
    return Boolean(
      moduleFound &&
      ((Array.isArray(moduleFound.permissions) && moduleFound.permissions.length > 0) ||
       (Array.isArray(moduleFound.permissionDetail) && moduleFound.permissionDetail.length > 0))
    );
  });
};

export const formatFullDateTime = (dateInput?: string | Date): string => {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hours12 = String(hours % 12 || 12).padStart(2, '0');

  return `${year}-${month}-${day} ${hours12}:${minutes}:${seconds} ${ampm}`;
};

