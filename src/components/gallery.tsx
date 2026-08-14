"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Heart, Camera, ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

import { useDoubleTap } from "@/hooks/use-double-tap";
import {
  formatRelativeTime,
  getLikedPhotosServerSnapshot,
  getLikedPhotosSnapshot,
  setPhotoLiked,
  setPhotoLikedLocally,
  subscribeLikedPhotos,
  subscribeToPhotos,
  uploadPhoto,
  type Photo,
} from "@/lib/photos";

const MAX_FILES_PER_UPLOAD = 10;

type DisplayPhoto = Photo & { pending?: boolean };

type PendingUpload = {
  tempId: string;
  blobUrl: string;
};

export function Gallery() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [loaded, setLoaded] = useState(false);
  const liked = useSyncExternalStore(
    subscribeLikedPhotos,
    getLikedPhotosSnapshot,
    getLikedPhotosServerSnapshot,
  );
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return subscribeToPhotos((next) => {
      setPhotos(next);
      setLoaded(true);
    });
  }, []);

  const toggleLike = (id: string) => {
    const isLiked = liked.has(id);
    setPhotoLikedLocally(id, !isLiked);
    setPhotoLiked(id, !isLiked).catch(() => {
      toast.error("Couldn't save your like, try again");
    });
  };

  const uploadWithToast = (file: File, id: string) => {
    return uploadPhoto(file)
      .then(() => {
        toast.success("Moment added", { id });
      })
      .catch(() => {
        toast.error("Upload failed, please try again", { id });
      });
  };

  // Shows the picked photo in the grid immediately via a local blob URL, while
  // the real upload happens in the background. The placeholder is removed once
  // the upload settles — the real photo takes over via the Firestore listener.
  const startOptimisticUpload = (file: File, id: string) => {
    const tempId = `pending-${id}`;
    const blobUrl = URL.createObjectURL(file);
    setPendingUploads((prev) => [...prev, { tempId, blobUrl }]);

    return uploadWithToast(file, id).finally(() => {
      setPendingUploads((prev) => prev.filter((p) => p.tempId !== tempId));
      URL.revokeObjectURL(blobUrl);
    });
  };

  // Camera always captures a single photo, so it gets the blocking "uploading" state.
  const handleCameraFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    startOptimisticUpload(file, "camera-upload").finally(() => {
      setUploading(false);
    });
  };

  // Gallery picks can be a batch — upload in the background without locking the UI.
  const handleGalleryFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (selected.length === 0) return;

    if (selected.length > MAX_FILES_PER_UPLOAD) {
      toast.error(`Select ${MAX_FILES_PER_UPLOAD} photos or fewer`);
      return;
    }

    selected.forEach((file, i) => {
      startOptimisticUpload(file, `upload-${i}-${file.name}`);
    });
  };

  const displayPhotos: DisplayPhoto[] = [
    ...pendingUploads.map(
      (p): DisplayPhoto => ({
        id: p.tempId,
        imageUrl: p.blobUrl,
        storagePath: "",
        caption: null,
        time: null,
        likes: 0,
        width: null,
        height: null,
        pending: true,
      }),
    ),
    ...photos,
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        {/* Hero */}
        <div className="relative h-72 w-full shrink-0 overflow-hidden">
          <Image src="/hero-photo.jpg" alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-linear-to-b from-transparent from-40% to-background" />
        </div>
        <div className="px-5 pb-2 pt-5 text-center">
          <h1 className="font-serif text-3xl font-medium tracking-wide text-foreground">
            Ηλίας <span className="text-primary">&</span> Κατερίνα
          </h1>
          <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
            Στιγμές από το γάμο μας
          </p>
        </div>

        {/* Feed */}
        <main className="flex-1 px-4 pb-16 pt-3">
          <UploadHero
            uploading={uploading}
            onCamera={() => cameraInputRef.current?.click()}
            onGallery={() => galleryInputRef.current?.click()}
          />
          {loaded && displayPhotos.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No moments yet — be the first to share one.
            </p>
          ) : (
            <>
              <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
                Τα τελευταία μας στιγμιότυπα
              </p>
              <div className="-mx-4 grid grid-cols-3 gap-0.5">
                {displayPhotos.map((item, i) => (
                  <PhotoCard
                    key={item.id}
                    item={item}
                    liked={liked.has(item.id)}
                    onLike={() => toggleLike(item.id)}
                    onOpen={() => setLightboxIndex(i)}
                  />
                ))}
              </div>
            </>
          )}
        </main>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleCameraFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryFiles}
        />
      </div>

      {lightboxIndex !== null && displayPhotos[lightboxIndex] && (
        <Lightbox
          items={displayPhotos}
          index={lightboxIndex}
          liked={liked}
          onLike={toggleLike}
          onIndexChange={setLightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}

function UploadHero({
  uploading,
  onCamera,
  onGallery,
}: {
  uploading: boolean;
  onCamera: () => void;
  onGallery: () => void;
}) {
  return (
    <section className="mb-8 text-center">
      <Camera className="mx-auto size-7 text-primary/70" strokeWidth={1.2} />
      <h2 className="mt-3 font-serif text-2xl leading-tight text-foreground">Share a moment</h2>
      <p className="mx-auto mt-1.5 max-w-[16rem] text-sm text-muted-foreground">
        Every photo you add becomes part of our album.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <UploadButton
          label="Camera"
          icon={<Camera className="size-5" />}
          onClick={onCamera}
          disabled={uploading}
          primary
        />
        <UploadButton
          label="Gallery"
          icon={<ImagePlus className="size-5" />}
          onClick={onGallery}
          disabled={uploading}
        />
      </div>
      {uploading && (
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin text-primary" /> Uploading…
        </p>
      )}
    </section>
  );
}

function Lightbox({
  items,
  index,
  liked,
  onLike,
  onIndexChange,
  onClose,
}: {
  items: Photo[];
  index: number;
  liked: Set<string>;
  onLike: (id: string) => void;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index]!;
  const [particles, setParticles] = useState<ReactionParticle[]>([]);
  const particleIdRef = useRef(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: "center",
    startIndex: index,
    duration: 25,
  });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => onIndexChange(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onIndexChange]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") emblaApi?.scrollNext();
      if (e.key === "ArrowLeft") emblaApi?.scrollPrev();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [emblaApi, onClose]);

  const sendReaction = (emoji: string) => {
    const burst: ReactionParticle[] = Array.from({ length: 16 }, () => {
      particleIdRef.current += 1;
      return {
        id: particleIdRef.current,
        emoji,
        left: 8 + Math.random() * 84,
        duration: 2200 + Math.random() * 1600,
        delay: Math.random() * 300,
        drift: (Math.random() - 0.5) * 120,
        rotate: (Math.random() - 0.5) * 60,
        scale: 0.8 + Math.random() * 0.7,
      };
    });
    setParticles((prev) => [...prev, ...burst]);
  };

  const removeParticle = (id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true">
      <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
        {particles.map((p) => (
          <span
            key={p.id}
            onAnimationEnd={() => removeParticle(p.id)}
            className="animate-emoji-rise absolute bottom-0 select-none"
            style={
              {
                left: `${p.left}%`,
                fontSize: `${p.scale * 1.75}rem`,
                animationDuration: `${p.duration}ms`,
                animationDelay: `${p.delay}ms`,
                "--drift": `${p.drift}px`,
                "--rotate": `${p.rotate}deg`,
              } as CSSProperties
            }
          >
            {p.emoji}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {index + 1} / {items.length}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex size-10 items-center justify-center rounded-full border border-border/70 bg-card text-foreground transition-colors hover:bg-secondary"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-hidden" ref={emblaRef}>
          <div className="flex h-full">
            {items.map((slideItem) => (
              <LightboxSlide
                key={slideItem.id}
                item={slideItem}
                liked={liked.has(slideItem.id)}
                onLike={() => onLike(slideItem.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-8">
        <span className="text-xs text-muted-foreground">{formatRelativeTime(item.time)}</span>
        <ReactionBar onReact={sendReaction} />
        <button
          type="button"
          onClick={() => onLike(item.id)}
          aria-pressed={liked.has(item.id)}
          aria-label={liked.has(item.id) ? "Unlike" : "Like"}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Heart
            className={
              "size-4 transition-all duration-200 " +
              (liked.has(item.id) ? "fill-destructive text-destructive" : "fill-transparent text-current")
            }
          />
          <span className="tabular-nums">{item.likes}</span>
        </button>
      </div>
    </div>
  );
}

function LightboxSlide({ item, liked, onLike }: { item: Photo; liked: boolean; onLike: () => void }) {
  const [burstId, setBurstId] = useState<number | null>(null);

  const handleTap = useDoubleTap(() => {
    if (!liked) onLike();
    setBurstId((id) => (id ?? 0) + 1);
  });

  return (
    <div className="flex h-full min-w-0 flex-[0_0_100%] items-center justify-center px-4">
      <div className="relative" onClick={handleTap}>
        <Image
          src={item.imageUrl}
          alt={item.caption ?? "Shared moment"}
          width={item.width ?? 1200}
          height={item.height ?? 1200}
          sizes="100vw"
          className="max-h-[calc(100vh-160px)] max-w-full select-none rounded-2xl object-contain shadow-[0_30px_80px_-40px_oklch(0.24_0.012_60_/_70%)]"
        />
        {burstId !== null && (
          <Heart
            key={burstId}
            onAnimationEnd={() => setBurstId(null)}
            className="animate-heart-burst pointer-events-none absolute inset-0 m-auto size-24 fill-destructive text-destructive drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
          />
        )}
      </div>
    </div>
  );
}

type ReactionParticle = {
  id: number;
  emoji: string;
  left: number;
  duration: number;
  delay: number;
  drift: number;
  rotate: number;
  scale: number;
};

const REACTIONS = ["❤️", "😍", "🥰", "😂", "😮", "🎉"];

function ReactionBar({ onReact }: { onReact: (emoji: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onReact(emoji)}
          aria-label={`React with ${emoji}`}
          className="text-xl leading-none transition-transform active:scale-75"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function PhotoCard({
  item,
  liked,
  onLike,
  onOpen,
}: {
  item: DisplayPhoto;
  liked: boolean;
  onLike: () => void;
  onOpen: () => void;
}) {
  const [burstId, setBurstId] = useState<number | null>(null);

  const handleTap = useDoubleTap(() => {
    if (item.pending) return;
    if (!liked) onLike();
    setBurstId((id) => (id ?? 0) + 1);
  }, item.pending ? undefined : onOpen);

  return (
    <button
      type="button"
      onClick={handleTap}
      aria-label="Open photo"
      className="relative aspect-square overflow-hidden bg-muted"
    >
      <Image
        src={item.imageUrl}
        alt={item.caption ?? "Shared moment"}
        fill
        sizes="33vw"
        unoptimized={item.pending}
        className="select-none object-cover object-top"
      />
      {item.pending && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25">
          <Loader2 className="size-5 animate-spin text-white" />
        </div>
      )}
      {burstId !== null && (
        <Heart
          key={burstId}
          onAnimationEnd={() => setBurstId(null)}
          className="animate-heart-burst pointer-events-none absolute inset-0 m-auto size-16 fill-destructive text-destructive drop-shadow-[0_4px_16px_rgba(0,0,0,0.35)]"
        />
      )}
    </button>
  );
}

function UploadButton({
  label,
  icon,
  onClick,
  disabled,
  primary,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 " +
        (primary
          ? "bg-primary text-primary-foreground shadow-[0_10px_24px_-10px_var(--primary)]"
          : "border border-border bg-secondary text-secondary-foreground")
      }
    >
      {icon}
      {label}
    </button>
  );
}
