import React from 'react';
import ManajemenPengguna from './ManajemenPengguna';
import { AppUser } from '../lib/firebase';

interface Props {
  currentUserRole: 'admin' | 'guru' | 'siswa';
  currentUser?: AppUser | null;
  classList?: string[];
  onNavigateToDataManagement?: () => void;
}

export default function VerifikasiPengguna({ currentUserRole, currentUser, classList, onNavigateToDataManagement }: Props) {
  return (
    <ManajemenPengguna 
      currentUserRole={currentUserRole} 
      currentUser={currentUser} 
      classList={classList}
      onNavigateToDataManagement={onNavigateToDataManagement}
    />
  );
}
