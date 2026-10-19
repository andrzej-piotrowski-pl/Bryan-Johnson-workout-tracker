// Workout radio: FIP's public genre stations from Radio France. Direct 128 kbps
// MP3 links keep the player inside the app, so volume and station changes work
// without an iframe. FIP Electro is the upbeat default.

export const DEFAULT_RADIO_STATION = "fipelectro";
export const DEFAULT_RADIO_VOLUME = 0.55;

const stream = (id) => `https://icecast.radiofrance.fr/${id}-midfi.mp3`;

export const RADIO_STATIONS = [
  {
    id: "fipelectro",
    name: "FIP Electro",
    tag: "Electronic",
    mood: "Upbeat",
    description: "Electronic music, from house to experimental.",
    stream: stream("fipelectro"),
  },
  {
    id: "fiprock",
    name: "FIP Rock",
    tag: "Rock",
    mood: "Upbeat",
    description: "Rock, from classics to new releases.",
    stream: stream("fiprock"),
  },
  {
    id: "fipgroove",
    name: "FIP Groove",
    tag: "Funk and soul",
    mood: "Upbeat",
    description: "Funk, soul and groove.",
    stream: stream("fipgroove"),
  },
  {
    id: "fipmetal",
    name: "FIP Metal",
    tag: "Metal",
    mood: "Upbeat",
    description: "Metal and heavy sounds.",
    stream: stream("fipmetal"),
  },
  {
    id: "fiphiphop",
    name: "FIP Hip Hop",
    tag: "Hip-hop",
    mood: "Upbeat",
    description: "Hip-hop and rap.",
    stream: stream("fiphiphop"),
  },
  {
    id: "fippop",
    name: "FIP Pop",
    tag: "Pop",
    mood: "Upbeat",
    description: "Pop, new and classic.",
    stream: stream("fippop"),
  },
  {
    id: "fipnouveautes",
    name: "FIP Nouveautés",
    tag: "New releases",
    mood: "Upbeat",
    description: "New releases from across FIP.",
    stream: stream("fipnouveautes"),
  },
  {
    id: "fip",
    name: "FIP",
    tag: "Eclectic",
    mood: "Chill",
    description: "The Paris station's eclectic mix.",
    stream: stream("fip"),
  },
  {
    id: "fipjazz",
    name: "FIP Jazz",
    tag: "Jazz",
    mood: "Chill",
    description: "Jazz, from bop to contemporary.",
    stream: stream("fipjazz"),
  },
  {
    id: "fipreggae",
    name: "FIP Reggae",
    tag: "Reggae",
    mood: "Chill",
    description: "Reggae, dub and roots.",
    stream: stream("fipreggae"),
  },
  {
    id: "fipworld",
    name: "FIP World",
    tag: "World",
    mood: "Chill",
    description: "Music from around the world.",
    stream: stream("fipworld"),
  },
];

export function radioStation(id) {
  return RADIO_STATIONS.find((station) => station.id === id) || null;
}

export function adjacentStation(id, step) {
  const index = RADIO_STATIONS.findIndex((station) => station.id === id);
  const from = index < 0 ? 0 : index;
  return RADIO_STATIONS[(from + step + RADIO_STATIONS.length) % RADIO_STATIONS.length];
}
