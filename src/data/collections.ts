export interface CollectionData {
  description?: string;
}

// Keyed by the raw tag string as it appears in src/data/photos.ts. An
// entry is optional — a tag with no entry here still gets a collection
// page, just without a description.
export const collectionData: Record<string, CollectionData> = {
  PCT: {
    description:
      "A stretch of the Pacific Crest Trail through the Southern California desert, from the San Jacinto Mountains to San Bernardino National Forest.",
  },
  "Reelfoot Lake": {
    description:
      "Bald cypress swamps and waterways at Reelfoot Lake State Park in Tennessee.",
  },
  Seattle: {
    description:
      "A trip through Seattle and the Olympic Peninsula, including a ferry ride across the Puget Sound and hikes in Olympic National Park.",
  },
  "Grand Teton National Park": {
    description:
      "Mountains, wildlife, and homesteads around Grand Teton National Park, Wyoming.",
  },
  "Four Pass Loop": {
    description:
      "A backpacking trip over four mountain passes in the Maroon Bells-Snowmass Wilderness, Colorado.",
  },
  "Acadia National Park": {
    description:
      "Lakes, beaches, and rocky coastline in Acadia National Park, Maine.",
  },
  "Sequin Island": {
    description:
      "A remote lighthouse and rugged coves on Sequin Island, Maine.",
  },
  "British Columbia": {
    description:
      "Wildlife spotting, including breaching humpback whales, in the Broughton Archipelago, British Columbia.",
  },
};
