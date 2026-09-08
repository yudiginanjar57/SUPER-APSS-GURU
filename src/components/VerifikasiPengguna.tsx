import React from 'react';
import ManajemenPengguna from './ManajemenPengguna';
import { AppUser } from '../lib/firebase';

interface Props {
  currentUserRole: 'admin' | 'guru' | 'siswa';
  currentUser?: AppUser | null;
  classList?: string[];
}

export default function VerifikasiPengguna({ currentUserRole, currentUser, classList }: Props) {
  return (
    <ManajemenPengguna 
      currentUserRole={currentUserRole} 
      currentUser={currentUser} 
      classList={classList} 
    />
  );
}
