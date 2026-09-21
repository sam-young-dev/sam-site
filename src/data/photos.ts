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
    tags: ["PCT"],
    location: "South of Mt San Jacinto, CA",
    blurb:
      "Clouds rolling through the valley along the PCT with the San Jacinto Mountains in the background.",
  },
  // DSCF7243_Original.jpeg
  dscf7243_original: {
    tags: ["PCT"],
    location: "Mt San Jacinto, CA",
    blurb: "Sunset view from the top of Mt San Jacinto on the PCT.",
  },
  // DSCF7259_Original.jpeg
  dscf7259_original: {
    tags: ["PCT"],
    location: "San Bernardino National Forest, CA",
    blurb:
      "Sunrise about to hit the valley along the desert section of the PCT.",
  },
  // DSCF7914.jpeg
  dscf7914: {
    tags: ["Reelfoot Lake"],
    location: "Reelfoot Lake State Park, TN",
    blurb: "Bald Cypresses line the waterway at Reelfoot Lake State Park.",
  },
  // DSCF7946.jpeg
  dscf7946: {
    tags: ["Reelfoot Lake"],
    location: "Reelfoot Lake State Park, TN",
    blurb: "Bald Cypress during sunset at Reelfoot Lake State Park.",
  },
  // DSCF7996.jpeg
  dscf7996: {
    tags: ["Seattle"],
    location: "Seattle, WA",
    blurb:
      "Ferry on ride from Seattle to Bainbridge Island through the Puget Sound.",
  },
  // DSCF8049.jpeg
  dscf8049: {
    tags: ["Seattle"],
    location: "Olympic National Park, WA",
    blurb: "Waterfall in Olympic National Park",
  },
  // DSCF8063.jpeg
  dscf8063: {
    tags: ["Seattle"],
    location: "Olympic National Park, WA",
    blurb:
      "Long strand of Bull Kelp found on the beach in Olympic National Park.",
  },
  // DSCF8174.jpeg
  dscf8174: {
    tags: ["Grand Teton National Park"],
    location: "Gros Venture Campground, Kelly, WY",
    blurb:
      "Sun setting behind Grand Teton mountain range seen from Gros Venture Campground.",
  },
  // DSCF8240.jpeg
  dscf8240: {
    tags: ["Grand Teton National Park"],
    location: "Jenny Lake, Grand Teton National Park, WY",
    blurb:
      "Golden-mantled ground squirrel most likely collecting wood fibers for a nest.",
  },
  // DSCF8329.jpeg
  dscf8329: {
    tags: ["Grand Teton National Park"],
    location: "Mormon Row, Grand Teton National Park, WY",
    blurb: "T.A. Moulton Barn seen from Mormon Row.",
  },
  // DSCF8490.jpeg
  dscf8490: {
    tags: ["Grand Teton National Park"],
    location: "Grand Teton National Park, WY",
    blurb: "Driving on highway 191 through Grand Teton National Park.",
  },
  // DSCF8520.jpeg
  dscf8520: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb:
      "View of mountain through the trees on Four Pass Loop trail. This is taken from the first campsite I stayed at in between Buckskin Pass and Trail Rider Pass.",
  },
  // DSCF8561.jpeg
  dscf8561: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "Hiking up to Trail Rider Pass on Four Pass Loop Trail.",
  },
  // DSCF8570.jpeg
  dscf8570: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "View of Maroon Bells on Four Pass Loop Trail.",
  },
  // DSCF8577.jpeg
  dscf8577: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb:
      "Snowmass lake along the ascent to Trail Rider Pass on Four Pass Loop Trail.",
  },
  // DSCF8589.jpeg
  dscf8589: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "Spine of Trail Rider Pass on Four Pass Loop Trail.",
  },
  // DSCF8606.jpeg
  dscf8606: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "Looking back on ascent to Frigid Air Pass on Four Pass Loop Trail.",
  },
  // DSCF8634.jpeg
  dscf8634: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "Snowy campsite along the Four Pass Loop Trail.",
  },
  // DSCF8678.jpeg
  dscf8678: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb:
      "View of Maroon Bells in the valley before Frigid Air Pass on Four Pass Loop Trail.",
  },
  // DSCF8692.jpeg
  dscf8692: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb: "Frigid Air Pass on Four Pass Loop Trail.",
  },
  // DSCF8695.jpeg
  dscf8695: {
    tags: ["Four Pass Loop"],
    location: "Maroon Bells-Snowmass Wilderness, CO",
    blurb:
      "In between Frigid Air Pass and West Maroon Pass on the Four Pass Loop Trail.",
  },
  // DSCF9241.jpeg
  dscf9241: {
    tags: ["Acadia National Park"],
    location: "Jordan Pond, Acadia National Park, ME",
    blurb:
      "Even though it is named Jordan Pond, it is actually a lake and is so clean it is used for the drinking supply in the local area. It covers 187 acres and reaches a maximum depth of 150 feet.",
  },
  // DSCF9301.jpeg
  dscf9301: {
    tags: ["Acadia National Park"],
    location: "Little Hunters Beach, Acadia National Park, ME",
    blurb:
      "An inlet near Little Hunter's Beach where tides intermittently bring in crashing waves.",
  },
  // DSCF9311.jpeg
  dscf9311: {
    tags: ["Acadia National Park"],
    location: "Little Hunters Beach, Acadia National Park, ME",
    blurb:
      "Seaweed known as Bladderwrack coating the granite rocks near Little Hunter's Beach.",
  },
  // DSCF9389.jpeg
  dscf9389: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb: "View of the cove from the the northern part of the island",
  },
  // DSCF9399.jpeg
  dscf9399: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb: "Sequin Island lighthouse and keeper's quarters.",
  },
  // DSCF9431.jpeg
  dscf9431: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb:
      "Wave crashing in at Cobblestone cove on the Southeastern side of the island.",
  },
  // DSCF9435.jpeg
  dscf9435: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb:
      "Sequin Island Lighthouse seen from Cobblestone cove on the Southeastern side of the island.",
  },
  // DSCF9451.jpeg
  dscf9451: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb:
      "Wave crashing in at Cobblestone cove on the Southeastern side of the island.",
  },
  // DSCF9482.jpeg
  dscf9482: {
    tags: ["Sequin Island"],
    location: "Sequin Island, ME",
    blurb: "Bench overlooking the north cove of Sequin Island.",
  },
  // DSCF9654.jpeg
  dscf9654: {
    tags: ["British Columbia"],
    location: "Broughton Archipelago Marine Provencial Park, BC, Canada",
    blurb: "Looking for wildlife...",
  },
  // DSCF9704.jpeg
  dscf9704: {
    tags: ["British Columbia"],
    location: "Broughton Archipelago Marine Provencial Park, BC, Canada",
    blurb: "Humpback whale showing off with a jump out of the water.",
  },
  // DSCF9705.jpeg
  dscf9705: {
    tags: ["British Columbia"],
    location: "Broughton Archipelago Marine Provencial Park, BC, Canada",
    blurb: "Humpback whale splash after jumping out of the water.",
  },
};
