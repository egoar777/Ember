import { ProfileCabinetContext } from './useProfileCabinet';
import { } from 'react';
import { useProfileCabinetState } from '../hooks/useProfileCabinetState';


export function ProfileCabinetProvider({ children }) {
  const value = useProfileCabinetState();
  return <ProfileCabinetContext.Provider value={value}>{children}</ProfileCabinetContext.Provider>;
}
