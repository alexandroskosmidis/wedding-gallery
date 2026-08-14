import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Timestamp,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { db, storage } from "@/firebase";

export type Photo = {
  id: string;
  imageUrl: string;
  storagePath: string;
  caption: string | null;
  time: Timestamp | null;
  likes: number;
  width: number | null;
  height: number | null;
};

const photosQuery = query(collection(db, "photos"), orderBy("time", "desc"));

export function subscribeToPhotos(onChange: (photos: Photo[]) => void) {
  return onSnapshot(photosQuery, (snapshot) => {
    onChange(
      snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          imageUrl: data.imageUrl as string,
          storagePath: data.storagePath as string,
          caption: (data.caption as string | undefined) ?? null,
          time: (data.time as Timestamp | undefined) ?? null,
          likes: (data.likes as number | undefined) ?? 0,
          width: (data.width as number | undefined) ?? null,
          height: (data.height as number | undefined) ?? null,
        };
      }),
    );
  });
}

async function getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  } catch {
    return null;
  }
}

export async function uploadPhoto(file: File) {
  const photoRef = doc(collection(db, "photos"));
  const storagePath = `photos/${photoRef.id}-${file.name}`;

  const dimensions = await getImageDimensions(file);

  await uploadBytes(ref(storage, storagePath), file);
  const imageUrl = await getDownloadURL(ref(storage, storagePath));
  const caption = file.name.replace(/\.[^.]+$/, "") || null;

  await setDoc(photoRef, {
    imageUrl,
    storagePath,
    caption,
    time: serverTimestamp(),
    likes: 0,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  });
}

export async function setPhotoLiked(photoId: string, liked: boolean) {
  await updateDoc(doc(db, "photos", photoId), {
    likes: increment(liked ? 1 : -1),
  });
}

export function formatRelativeTime(time: Timestamp | null): string {
  if (!time) return "Just now";

  const seconds = Math.floor((Date.now() - time.toMillis()) / 1000);
  if (seconds < 45) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Remembers which photos this browser has liked, so refreshing the page
// doesn't let someone re-like (and the shared Firestore counter can't be
// bumped by accident). Exposed as an external store so components can read
// it with useSyncExternalStore instead of syncing it into state via an effect.
const LIKED_PHOTOS_KEY = "wedding-gallery:liked-photos";
const emptyLikedPhotos = new Set<string>();
const likedPhotosListeners = new Set<() => void>();
let likedPhotosCache: Set<string> | null = null;

function readLikedPhotoIds(): Set<string> {
  try {
    const raw = window.localStorage.getItem(LIKED_PHOTOS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function subscribeLikedPhotos(callback: () => void) {
  likedPhotosListeners.add(callback);
  return () => {
    likedPhotosListeners.delete(callback);
  };
}

export function getLikedPhotosSnapshot(): Set<string> {
  likedPhotosCache ??= readLikedPhotoIds();
  return likedPhotosCache;
}

export function getLikedPhotosServerSnapshot(): Set<string> {
  return emptyLikedPhotos;
}

export function setPhotoLikedLocally(photoId: string, liked: boolean) {
  const next = new Set(getLikedPhotosSnapshot());
  if (liked) {
    next.add(photoId);
  } else {
    next.delete(photoId);
  }
  likedPhotosCache = next;
  window.localStorage.setItem(LIKED_PHOTOS_KEY, JSON.stringify([...next]));
  likedPhotosListeners.forEach((listener) => listener());
}
