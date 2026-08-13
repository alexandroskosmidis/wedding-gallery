"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  Heart,
  Camera,
  ImagePlus,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Aperture,
} from "lucide-react";
import { toast } from "sonner";

const photo1 = "/photos/photo1.jpg";
const photo2 = "/photos/photo2.jpg";
const photo3 = "/photos/photo3.jpg";
const photo4 = "/photos/photo4.jpg";

type FeedItem = {
  id: string;
  src: string;
  caption: string;
  time: string;
  likes: number;
};

const INITIAL_FEED: FeedItem[] = [
  {
    id: "1",
    src: photo1,
    caption: "The first dance ✨",
    time: "Just now",
    likes: 12,
  },
  {
    id: "2",
    src: photo2,
    caption: "Dance floor lit",
    time: "2 mins ago",
    likes: 8,
  },
  {
    id: "3",
    src: photo3,
    caption: "Candles & flowers",
    time: "5 mins ago",
    likes: 23,
  },
  {
    id: "4",
    src: photo4,
    caption: "Golden hour, forever",
    time: "11 mins ago",
    likes: 31,
  },
];

export function Gallery() {
  const [feed, setFeed] = useState<FeedItem[]>(INITIAL_FEED);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [uploading, setUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      setFeed((items) =>
        items.map((it) =>
          it.id === id ? { ...it, likes: it.likes + (next[id] ? 1 : -1) } : it,
        ),
      );
      return next;
    });
  };

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so the same file can be picked again later
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    toast.loading("Uploading…", {
      icon: <Loader2 className="size-4 animate-spin text-primary" />,
      id: "upload",
    });

    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const newItem: FeedItem = {
        id: crypto.randomUUID(),
        src: url,
        caption: file.name.replace(/\.[^.]+$/, "") || "A new moment",
        time: "Just now",
        likes: 0,
      };
      setFeed((prev) => [newItem, ...prev]);
      setLiked((prev) => ({ ...prev, [newItem.id]: false }));
      setUploading(false);
      toast.success("Moment added", { id: "upload" });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
          <div className="px-5 py-4 text-center">
            <h1 className="font-serif text-3xl font-medium tracking-wide text-foreground">
              Maria <span className="text-primary">&</span> Alexis
            </h1>
            <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.32em] text-muted-foreground">
              Shared Moments
            </p>
          </div>
        </header>

        {/* Feed */}
        <main className="flex-1 px-4 pb-16 pt-5">
          <UploadHero
            uploading={uploading}
            onCamera={() => cameraInputRef.current?.click()}
            onGallery={() => galleryInputRef.current?.click()}
          />
          <div className="columns-2 gap-3 [column-fill:balance]">
            {feed.map((item, i) => (
              <PhotoCard
                key={item.id}
                item={item}
                liked={!!liked[item.id]}
                onLike={() => toggleLike(item.id)}
                onOpen={() => setLightboxIndex(i)}
              />
            ))}
          </div>
        </main>

        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {lightboxIndex !== null && feed[lightboxIndex] && (
        <Lightbox
          items={feed}
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
    <section className="mb-7 rounded-3xl border border-border/70 bg-card/80 px-6 py-8 text-center shadow-[0_18px_50px_-32px_oklch(0.24_0.012_60_/_60%)] backdrop-blur-sm">
      <div className="relative mx-auto flex size-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/8" />
        <span className="absolute inset-2 rounded-full border border-primary/25" />
        <Camera className="size-11 text-primary" strokeWidth={1.1} />
        <Aperture
          className="absolute bottom-1 right-1 size-6 rounded-full bg-card text-primary/70"
          strokeWidth={1.2}
        />
      </div>
      <h2 className="mt-5 font-serif text-2xl leading-tight text-foreground">Share a moment</h2>
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
  items: FeedItem[];
  index: number;
  liked: Record<string, boolean>;
  onLike: (id: string) => void;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const item = items[index]!;
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (dir: number) => {
      onIndexChange((index + dir + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX ?? null;
        touchX.current = null;
        if (start === null || end === null) return;
        if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
      }}
    >
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

      <div className="relative flex flex-1 items-center justify-center px-4 pb-4">
        <img
          key={item.id}
          src={item.src}
          alt={item.caption}
          className="animate-lightbox-in max-h-full max-w-full rounded-2xl object-contain shadow-[0_30px_80px_-40px_oklch(0.24_0.012_60_/_70%)]"
        />
        <LightboxArrow side="left" onClick={() => go(-1)} />
        <LightboxArrow side="right" onClick={() => go(1)} />
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-8">
        <span className="text-xs text-muted-foreground">{item.time}</span>
        <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
          Swipe to browse
        </span>
        <button
          type="button"
          onClick={() => onLike(item.id)}
          aria-pressed={!!liked[item.id]}
          aria-label={liked[item.id] ? "Unlike" : "Like"}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <Heart
            className={
              "size-4 transition-all duration-200 " +
              (liked[item.id] ? "fill-destructive text-destructive" : "fill-transparent text-current")
            }
          />
          <span className="tabular-nums">{item.likes}</span>
        </button>
      </div>
    </div>
  );
}

function LightboxArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Previous photo" : "Next photo"}
      className={
        "absolute top-1/2 -translate-y-1/2 inline-flex size-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-sm backdrop-blur transition-transform active:scale-95 " +
        (side === "left" ? "left-2" : "right-2")
      }
    >
      {side === "left" ? <ChevronLeft className="size-5" /> : <ChevronRight className="size-5" />}
    </button>
  );
}

function PhotoCard({
  item,
  liked,
  onLike,
  onOpen,
}: {
  item: FeedItem;
  liked: boolean;
  onLike: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="mb-3 break-inside-avoid">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card p-2 shadow-[0_12px_35px_-24px_oklch(0.24_0.012_60_/_55%)]">
        <button
          type="button"
          onClick={onOpen}
          aria-label="Open photo"
          className="block w-full overflow-hidden rounded-xl bg-muted transition-transform active:scale-[0.98]"
        >
          <img
            src={item.src}
            alt={item.caption}
            loading="lazy"
            className="h-auto w-full select-none object-cover"
          />
        </button>
        <div className="px-1 pb-1 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{item.time}</span>
            <button
              type="button"
              onClick={onLike}
              aria-pressed={liked}
              aria-label={liked ? "Unlike" : "Like"}
              className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Heart
                className={
                  "size-4 transition-all duration-200 " +
                  (liked
                    ? "fill-destructive text-destructive"
                    : "fill-transparent text-current group-hover:scale-110")
                }
                strokeWidth={2}
              />
              <span className="tabular-nums">{item.likes}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
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
