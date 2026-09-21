export interface PhotoData {
  tags: string[];
  blurb: string;
  location?: string;
}

// Keyed by photo slug (see slugify() in src/utils/photos.ts), which is
// derived from the source image's filename. Fields are optional in
// practice: an empty blurb/tags list or a missing entry falls back to
// automatic-only metadata, so dropping in a new JPEG without an entry
// here still builds fine.
export const photoData: Record<string, PhotoData> = {
  // DSCF7203_Original.jpeg
  dscf7203_original: {
    tags: [],
    blurb: "",
  },
  // DSCF7243_Original.jpeg
  dscf7243_original: {
    tags: [],
    blurb: "",
  },
  // DSCF7259_Original.jpeg
  dscf7259_original: {
    tags: [],
    blurb: "",
  },
  // DSCF7914.jpeg
  dscf7914: {
    tags: [],
    blurb: "",
  },
  // DSCF7946.jpeg
  dscf7946: {
    tags: [],
    blurb: "",
  },
  // DSCF7996.jpeg
  dscf7996: {
    tags: [],
    blurb: "",
  },
  // DSCF8049.jpeg
  dscf8049: {
    tags: [],
    blurb: "",
  },
  // DSCF8063.jpeg
  dscf8063: {
    tags: [],
    blurb: "",
  },
  // DSCF8174.jpeg
  dscf8174: {
    tags: [],
    blurb: "",
  },
  // DSCF8240.jpeg
  dscf8240: {
    tags: [],
    blurb: "",
  },
  // DSCF8329.jpeg
  dscf8329: {
    tags: [],
    blurb: "",
  },
  // DSCF8490.jpeg
  dscf8490: {
    tags: [],
    blurb: "",
  },
  // DSCF8520.jpeg
  dscf8520: {
    tags: [],
    blurb: "",
  },
  // DSCF8561.jpeg
  dscf8561: {
    tags: [],
    blurb: "",
  },
  // DSCF8570.jpeg
  dscf8570: {
    tags: [],
    blurb: "",
  },
  // DSCF8577.jpeg
  dscf8577: {
    tags: [],
    blurb: "",
  },
  // DSCF8589.jpeg
  dscf8589: {
    tags: [],
    blurb: "",
  },
  // DSCF8606.jpeg
  dscf8606: {
    tags: [],
    blurb: "",
  },
  // DSCF8634.jpeg
  dscf8634: {
    tags: [],
    blurb: "",
  },
  // DSCF8678.jpeg
  dscf8678: {
    tags: [],
    blurb: "",
  },
  // DSCF8692.jpeg
  dscf8692: {
    tags: [],
    blurb: "",
  },
  // DSCF8695.jpeg
  dscf8695: {
    tags: [],
    blurb: "",
  },
  // DSCF9241.jpeg
  dscf9241: {
    tags: [],
    blurb: "",
  },
  // DSCF9301.jpeg
  dscf9301: {
    tags: [],
    blurb: "",
  },
  // DSCF9311.jpeg
  dscf9311: {
    tags: [],
    blurb: "",
  },
  // DSCF9389.jpeg
  dscf9389: {
    tags: [],
    blurb: "",
  },
  // DSCF9399.jpeg
  dscf9399: {
    tags: [],
    blurb: "",
  },
  // DSCF9431.jpeg
  dscf9431: {
    tags: [],
    blurb: "",
  },
  // DSCF9435.jpeg
  dscf9435: {
    tags: [],
    blurb: "",
  },
  // DSCF9451.jpeg
  dscf9451: {
    tags: [],
    blurb: "",
  },
  // DSCF9482.jpeg
  dscf9482: {
    tags: [],
    blurb: "",
  },
  // DSCF9654.jpeg
  dscf9654: {
    tags: [],
    blurb: "",
  },
  // DSCF9704.jpeg
  dscf9704: {
    tags: [],
    blurb: "",
  },
  // DSCF9705.jpeg
  dscf9705: {
    tags: [],
    blurb: "",
  },
};
