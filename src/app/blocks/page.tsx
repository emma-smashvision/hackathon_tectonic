import type { Metadata } from "next";
import { BlockGallery } from "./gallery";

export const metadata: Metadata = { title: "Building blocks · One KBC" };

export default function BlocksPage() {
  return <BlockGallery />;
}
