import { collectionData } from "../data/collections";
import { getPhotos, type Photo } from "./photos";

export interface Collection {
  tag: string;
  slug: string;
  description: string | null;
  cover: Photo;
  count: number;
  photos: Photo[];
}

export function slugifyTag(tag: string): string {
  return tag
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateValue(date: string | null): number {
  if (!date) return NaN;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? NaN : parsed;
}

// Sorts newest-first, pushing photos with no usable date to the end
// rather than letting them scatter unpredictably among dated ones.
function compareByDateDesc(a: Photo, b: Photo) {
  const dateA = dateValue(a.meta.date);
  const dateB = dateValue(b.meta.date);
  const validA = !Number.isNaN(dateA);
  const validB = !Number.isNaN(dateB);
  if (validA && validB) return dateB - dateA;
  if (validA) return -1;
  if (validB) return 1;
  return 0;
}

// compareByDateDesc sorts newest-first with undated photos pushed to the
// end, so the earliest-dated photo is simply the last dated entry.
function earliestPhoto(sortedNewestFirst: Photo[]): Photo {
  const dated = sortedNewestFirst.filter((photo) => !Number.isNaN(dateValue(photo.meta.date)));
  return dated.length > 0 ? dated[dated.length - 1] : sortedNewestFirst[0];
}

let collectionsPromise: Promise<Collection[]> | null = null;

export function getCollections(): Promise<Collection[]> {
  if (!collectionsPromise) {
    collectionsPromise = loadCollections();
  }
  return collectionsPromise;
}

async function loadCollections(): Promise<Collection[]> {
  const photos = await getPhotos();
  const photosByTag = new Map<string, Photo[]>();

  for (const photo of photos) {
    for (const tag of photo.tags) {
      const existing = photosByTag.get(tag);
      if (existing) {
        existing.push(photo);
      } else {
        photosByTag.set(tag, [photo]);
      }
    }
  }

  const collections = Array.from(photosByTag.entries()).map(([tag, tagPhotos]) => {
    const photos = [...tagPhotos].sort(compareByDateDesc);
    return {
      tag,
      slug: slugifyTag(tag),
      description: collectionData[tag]?.description ?? null,
      cover: earliestPhoto(photos),
      count: tagPhotos.length,
      photos,
    };
  });

  return collections.sort((a, b) => compareByDateDesc(a.cover, b.cover));
}
