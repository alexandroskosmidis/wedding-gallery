import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";

export const metadata: Metadata = {
  title: "Maria & Alexis — Shared Moments",
  description:
    "A shared wedding photo gallery for Maria & Alexis. Capture and relive the moments.",
  openGraph: {
    title: "Maria & Alexis — Shared Moments",
    description:
      "A shared wedding photo gallery for Maria & Alexis. Capture and relive the moments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function Home() {
  return <Gallery />;
}
