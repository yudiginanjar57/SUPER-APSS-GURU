/**
 * Google Drive Database & Cloud Storage Engine for EduAsisten & SuperApp Guru
 * Allows storing full app database (teachers, classes, students, attendance, grades, journals, modules, AI chats)
 * and generated documents directly inside the teacher's personal/school Google Drive.
 */

export interface DriveDatabaseFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

export interface GoogleDriveUser {
  email: string;
  name?: string;
  picture?: string;
}

const APP_FOLDER_NAME = "EduAsisten_Database_Guru";
const DB_FILENAME = "eduasisten_master_database.json";

/**
 * Ensures or retrieves the designated EduAsisten root folder in user's Drive.
 */
export async function getOrCreateAppFolder(accessToken: string): Promise<string> {
  // Check if folder exists
  const query = encodeURIComponent(`name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
  }

  // Create folder if not found
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
      description: "Folder basis data dan arsip otomatis aplikasi EduAsisten & SuperApp Guru"
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Gagal membuat folder di Google Drive: ${createRes.status} ${errText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Saves or updates the master JSON database directly in the designated Drive folder.
 */
export async function saveMasterDatabaseToDrive(accessToken: string, fullDataPayload: any): Promise<{ fileId: string; modifiedTime: string }> {
  const folderId = await getOrCreateAppFolder(accessToken);
  const fileContent = JSON.stringify(fullDataPayload, null, 2);
  const blob = new Blob([fileContent], { type: "application/json" });

  // Check if eduasisten_master_database.json already exists in that folder
  const query = encodeURIComponent(`name = '${DB_FILENAME}' and '${folderId}' in parents and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)`;
  
  const checkRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  let existingFileId: string | null = null;
  if (checkRes.ok) {
    const searchData = await checkRes.json();
    if (searchData.files && searchData.files.length > 0) {
      existingFileId = searchData.files[0].id;
    }
  }

  if (existingFileId) {
    // Update existing database file
    const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const updateRes = await fetch(updateUrl, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: blob
    });

    if (!updateRes.ok) {
      const err = await updateRes.text();
      throw new Error(`Gagal memperbarui database di Drive: ${updateRes.status} ${err}`);
    }

    const updated = await updateRes.json();
    return {
      fileId: existingFileId,
      modifiedTime: updated.modifiedTime || new Date().toISOString()
    };
  } else {
    // Create new file inside folder with multipart form
    const metadata = {
      name: DB_FILENAME,
      parents: [folderId],
      mimeType: "application/json",
      description: "Master database EduAsisten yang tersinkronisasi lintas perangkat"
    };

    const form = new FormData();
    form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
    form.append("file", blob);

    const createUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime";
    const createRes = await fetch(createUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Gagal membuat database di Drive: ${createRes.status} ${err}`);
    }

    const created = await createRes.json();
    return {
      fileId: created.id,
      modifiedTime: created.modifiedTime || new Date().toISOString()
    };
  }
}

/**
 * Loads the master database from Google Drive.
 */
export async function loadMasterDatabaseFromDrive(accessToken: string): Promise<{ data: any; modifiedTime: string } | null> {
  const folderId = await getOrCreateAppFolder(accessToken);
  const query = encodeURIComponent(`name = '${DB_FILENAME}' and '${folderId}' in parents and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!searchRes.ok) {
    throw new Error(`Gagal mencari file database di Drive: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  if (!searchData.files || searchData.files.length === 0) {
    return null; // Belum ada database di Drive
  }

  const targetFile = searchData.files[0];
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${targetFile.id}?alt=media`;
  const downloadRes = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!downloadRes.ok) {
    throw new Error(`Gagal mengunduh isi database dari Drive: ${downloadRes.status}`);
  }

  const parsed = await downloadRes.json();
  return {
    data: parsed,
    modifiedTime: targetFile.modifiedTime
  };
}

/**
 * Saves an exported document (Word/HTML/PDF) directly into a subfolder in Google Drive.
 */
export async function saveDocumentToDriveFolder(
  accessToken: string,
  fileName: string,
  contentBlob: Blob,
  subfolderName: string = "Arsip_Dokumen_EduAsisten"
): Promise<{ fileId: string; webViewLink?: string }> {
  const rootFolderId = await getOrCreateAppFolder(accessToken);

  // Check subfolder
  const query = encodeURIComponent(`name = '${subfolderName}' and '${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const subRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  let subfolderId = rootFolderId;
  if (subRes.ok) {
    const resData = await subRes.json();
    if (resData.files && resData.files.length > 0) {
      subfolderId = resData.files[0].id;
    } else {
      // Create subfolder
      const createSub = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: subfolderName,
          parents: [rootFolderId],
          mimeType: "application/vnd.google-apps.folder"
        })
      });
      if (createSub.ok) {
        const subCreated = await createSub.json();
        subfolderId = subCreated.id;
      }
    }
  }

  const metadata = {
    name: fileName,
    parents: [subfolderId],
    mimeType: contentBlob.type || "application/octet-stream"
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", contentBlob);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Gagal mengunggah dokumen ke Drive: ${uploadRes.status} ${err}`);
  }

  const uploaded = await uploadRes.json();
  return {
    fileId: uploaded.id,
    webViewLink: uploaded.webViewLink
  };
}

/**
 * Retrieves user profile info using the Google access token
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleDriveUser | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      email: data.email,
      name: data.name,
      picture: data.picture
    };
  } catch (err) {
    console.warn("Gagal mengambil info profil Google:", err);
    return null;
  }
}
