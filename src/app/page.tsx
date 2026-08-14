import type { Metadata } from "next";
import { Gallery } from "@/components/gallery";

export const metadata: Metadata = {
  title: "Hlias & Katerina — Shared Moments",
  description:
    "A shared wedding photo gallery for Hlias & Katerina. Capture and relive the moments.",
  openGraph: {
    title: "Hlias & Katerina — Shared Moments",
    description:
      "A shared wedding photo gallery for Hlias & Katerina. Capture and relive the moments.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function Home() {
  return <Gallery />;
}
