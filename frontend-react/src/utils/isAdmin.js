export function isAdminUser(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}
