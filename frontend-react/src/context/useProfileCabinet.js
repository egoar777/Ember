import { createContext, useContext } from 'react';

export const ProfileCabinetContext = createContext(null);

export function useProfileCabinet() {
  const ctx = useContext(ProfileCabinetContext);
  if (!ctx) {
    throw new Error('useProfileCabinet must be used inside ProfileCabinetProvider');
  }
  return ctx;
}
