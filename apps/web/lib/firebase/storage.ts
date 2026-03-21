'use client';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './client';

const storage = getStorage(app);

// Returns the public download URL after uploading
export async function uploadCoverImage(file: File, eventId: string): Promise<string> {
  const ext      = file.name.split('.').pop() ?? 'jpg';
  const path     = `events/${eventId}/cover.${ext}`;
  const fileRef  = ref(storage, path);

  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}

export async function uploadAvatar(file: File, userId: string): Promise<string> {
  const ext      = file.name.split('.').pop() ?? 'jpg';
  const path     = `avatars/${userId}/avatar.${ext}`;
  const fileRef  = ref(storage, path);

  await uploadBytes(fileRef, file, { contentType: file.type });
  return getDownloadURL(fileRef);
}
