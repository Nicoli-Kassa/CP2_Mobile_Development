import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { getFirebaseStorage } from './firebase';

/**
 * Upload das fotos para o Firebase Storage.
 *
 * Só a URL final (`getDownloadURL`) é gravada no Firestore — nunca a imagem
 * em Base64.
 */

/** Lê o arquivo local como Blob (XHR é o caminho mais estável no React Native). */
function uriToBlob(uri: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response as Blob);
    xhr.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function uploadImage(path: string, localUri: string): Promise<string> {
  const blob = await uriToBlob(localUri);
  const imageRef = ref(getFirebaseStorage(), path);
  await uploadBytes(imageRef, blob, { contentType: blob.type || 'image/jpeg' });
  return getDownloadURL(imageRef);
}

export function uploadProfilePhoto(uid: string, localUri: string): Promise<string> {
  return uploadImage(`users/${uid}/profile.jpg`, localUri);
}

export function uploadGroupPhoto(groupId: string, localUri: string): Promise<string> {
  return uploadImage(`groups/${groupId}/photo.jpg`, localUri);
}
