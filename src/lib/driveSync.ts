export async function uploadBackupToDrive(accessToken: string, payload: any, filename: string): Promise<string> {
  const fileContent = JSON.stringify(payload, null, 2);
  const file = new Blob([fileContent], { type: 'application/json' });
  
  const metadata = {
    name: filename,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gagal mengunggah ke Google Drive: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.id;
}

export interface DriveBackupItem {
  id: string;
  name: string;
  createdTime: string;
  size: string;
}

export function sanitizeSyncKey(key: string): string {
  if (!key) return "default";
  return key.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
}

export async function listDriveBackups(accessToken: string, syncKey: string): Promise<DriveBackupItem[]> {
  const cleanKey = sanitizeSyncKey(syncKey);
  const rawKey = (syncKey || "").trim().toLowerCase();
  
  // Search broadly for any backup file matching Backup_SuperAppGuru in Drive
  const q = encodeURIComponent(`name contains 'Backup_SuperAppGuru' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,createdTime,size)&orderBy=createdTime desc`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengambil daftar cadangan dari Drive: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const files: DriveBackupItem[] = data.files || [];

  if (!rawKey) return files;

  // Filter files matching either cleanKey or raw syncKey, or fallback to returning all files if only 1 exists
  const matchedFiles = files.filter(file => {
    const fn = file.name.toLowerCase();
    return fn.includes(cleanKey) || fn.includes(rawKey) || files.length === 1;
  });

  return matchedFiles.length > 0 ? matchedFiles : files;
}

export async function downloadDriveBackup(accessToken: string, fileId: string): Promise<any> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gagal mengunduh file: ${res.status} ${errText}`);
  }
  return await res.json();
}

export async function deleteDriveBackup(accessToken: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

export async function pruneOldDriveBackups(accessToken: string, syncKey: string): Promise<void> {
  try {
    const files = await listDriveBackups(accessToken, syncKey);
    const cutoffTime = Date.now() - (5 * 24 * 60 * 60 * 1000);
    
    for (const file of files) {
      const fileTime = new Date(file.createdTime).getTime();
      if (fileTime < cutoffTime) {
        await deleteDriveBackup(accessToken, file.id);
      }
    }
  } catch (error) {
    console.warn("Gagal menghapus file lama di Drive:", error);
  }
}
