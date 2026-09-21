import type { ImageMetadata } from "astro";
import path from "node:path";
import fs from "node:fs/promises";
import exifr from "exifr";
import { photoData } from "../data/photos";

export interface PhotoMeta {
  date: string | null;
  camera: string | null;
  lens: string | null;
  focalLength: string | null;
  aperture: string | null;
  shutterSpeed: string | null;
  iso: string | null;
  location: string | null;
}

export interface Photo {
  slug: string;
  image: ImageMetadata;
  meta: PhotoMeta;
  tags: string[];
  blurb: string;
}

const imageModules = import.meta.glob<ImageMetadata>("../assets/images/*.{jpeg,jpg,png}", {
  eager: true,
  import: "default",
});

const imagesDir = path.resolve(process.cwd(), "src/assets/images");

function slugify(filePath: string) {
  return path
    .basename(filePath)
    .replace(/\.(jpeg|jpg|png)$/i, "")
    .toLowerCase();
}

function formatCamera(make?: string, model?: string) {
  if (!make && !model) return null;
  const niceMake = make
    ? make.charAt(0).toUpperCase() + make.slice(1).toLowerCase()
    : "";
  return [niceMake, model].filter(Boolean).join(" ");
}

function formatShutterSpeed(exposureTime?: number) {
  if (!exposureTime) return null;
  if (exposureTime >= 1) return `${exposureTime}s`;
  return `1/${Math.round(1 / exposureTime)}s`;
}

function formatAperture(fNumber?: number) {
  if (!fNumber) return null;
  return `f/${fNumber}`;
}

function formatFocalLength(focalLength?: number, focalLength35mm?: number) {
  if (!focalLength) return null;
  if (focalLength35mm && focalLength35mm !== focalLength) {
    return `${focalLength}mm (${focalLength35mm}mm equiv.)`;
  }
  return `${focalLength}mm`;
}

function formatIso(iso?: number) {
  if (!iso) return null;
  return `ISO ${iso}`;
}

function formatLocation(latitude?: number, longitude?: number) {
  if (latitude === undefined || longitude === undefined) return null;
  const lat = `${Math.abs(latitude).toFixed(4)}° ${latitude >= 0 ? "N" : "S"}`;
  const lon = `${Math.abs(longitude).toFixed(4)}° ${longitude >= 0 ? "E" : "W"}`;
  return `${lat}, ${lon}`;
}

function formatDate(dateTimeOriginal?: Date) {
  if (!dateTimeOriginal) return null;
  return dateTimeOriginal.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

let photosPromise: Promise<Photo[]> | null = null;

export function getPhotos(): Promise<Photo[]> {
  if (!photosPromise) {
    photosPromise = loadPhotos();
  }
  return photosPromise;
}

async function loadPhotos(): Promise<Photo[]> {
  const entries = Object.entries(imageModules).sort(([a], [b]) => a.localeCompare(b));

  return Promise.all(
    entries.map(async ([filePath, image]) => {
      const absolutePath = path.join(imagesDir, path.basename(filePath));
      const buffer = await fs.readFile(absolutePath);
      const exif = await exifr.parse(buffer, [
        "Make",
        "Model",
        "LensModel",
        "FNumber",
        "ExposureTime",
        "ISO",
        "FocalLength",
        "FocalLengthIn35mmFormat",
        "DateTimeOriginal",
      ]).catch(() => null);
      const gps = await exifr.gps(buffer).catch(() => null);
      const slug = slugify(filePath);
      const authored = photoData[slug];

      return {
        slug,
        image,
        meta: {
          date: formatDate(exif?.DateTimeOriginal),
          camera: formatCamera(exif?.Make, exif?.Model),
          lens: exif?.LensModel ?? null,
          focalLength: formatFocalLength(exif?.FocalLength, exif?.FocalLengthIn35mmFormat),
          aperture: formatAperture(exif?.FNumber),
          shutterSpeed: formatShutterSpeed(exif?.ExposureTime),
          iso: formatIso(exif?.ISO),
          location: authored?.location ?? formatLocation(gps?.latitude, gps?.longitude),
        },
        tags: authored?.tags ?? [],
        blurb: authored?.blurb ?? "",
      };
    })
  );
}
