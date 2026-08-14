import { supabase } from "@/supabase";

export type Photo = {
  id: string;
  imageUrl: string;
  storagePath: string;
  caption: string | null;
  time: string | null;
  likes: number;
  width: number | null;
  height: number | null;
};

type PhotoRow = {
  id: string;
  image_url: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
  likes: number;
  width: number | null;
  height: number | null;
};

function mapRow(row: PhotoRow): Photo {
  return {
    id: row.id,
    imageUrl: row.image_url,
    storagePath: row.storage_path,
    caption: row.caption,
    time: row.created_at,
    likes: row.likes,
    width: row.width,
    height: row.height,
  };
}

export function subscribeToPhotos(onChange: (photos: Photo[]) => void) {
  let cancelled = false;

  const load = async () => {
    const { data, error } = await supabase
      .from("photos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!cancelled && !error && data) {
      onChange((data as PhotoRow[]).map(mapRow));
    }
  };

  load();

  const channel = supabase
    .channel("photos-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "photos" }, load)
    .subscribe();

  return () => {
    cancelled = true;
    supabase.removeChannel(channel);
  };
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
  const dimensions = await getImageDimensions(file);
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("photos").upload(storagePath, file);
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("photos").getPublicUrl(storagePath);

  const caption = file.name.replace(/\.[^.]+$/, "") || null;

  const { error: insertError } = await supabase.from("photos").insert({
    image_url: publicUrl,
    storage_path: storagePath,
    caption,
    likes: 0,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
  });
  if (insertError) throw insertError;
}

export async function setPhotoLiked(photoId: string, liked: boolean) {
  const { error } = await supabase.rpc("increment_likes", {
    photo_id: photoId,
    delta: liked ? 1 : -1,
  });
  if (error) throw error;
}

export function formatRelativeTime(time: string | null): string {
  if (!time) return "Just now";

  const seconds = Math.floor((Date.now() - new Date(time).getTime()) / 1000);
  if (seconds < 45) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Remembers which photos this browser has liked, so refreshing the page
// doesn't let someone re-like (and the shared counter can't be bumped by
// accident). Exposed as an external store so components can read it with
// useSyncExternalStore instead of syncing it into state via an effect.
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
