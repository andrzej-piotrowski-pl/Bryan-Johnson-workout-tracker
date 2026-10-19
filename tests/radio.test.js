import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_RADIO_STATION, DEFAULT_RADIO_VOLUME, RADIO_SOURCES, RADIO_STATIONS, adjacentStation, radioStation } from "../public/js/data/radio.js";
import { defaultProfile } from "../public/js/personalize.js";

test("the workout radio has an energetic default and a working station list", () => {
  assert.equal(new Set(RADIO_STATIONS.map((station) => station.id)).size, RADIO_STATIONS.length, "station ids are unique");
  assert.equal(new Set(RADIO_STATIONS.map((station) => station.name)).size, RADIO_STATIONS.length, "station names are unique");
  assert.equal(radioStation(DEFAULT_RADIO_STATION)?.mood, "High energy", "the default station is energetic");
  assert(RADIO_STATIONS.filter((station) => station.mood === "High energy").length >= 6, "there are several high-energy choices");
  assert(RADIO_STATIONS.length >= 18, "the station list has plenty of choices");
  const hosts = new Set(RADIO_STATIONS.map((station) => new URL(station.stream).hostname));
  assert(hosts.size >= 6, "the stations come from several providers");
  assert(RADIO_SOURCES.length >= 6, "the provider links cover the station list");
  assert(RADIO_SOURCES.every((source) => /^https:\/\//.test(source.url)), "provider links use HTTPS");
  for (const station of RADIO_STATIONS) {
    assert.match(station.stream, /^https:\/\//, `${station.name} has a direct HTTPS stream`);
    if (station.fallback) assert.match(station.fallback, /^https:\/\//, `${station.name} has a secure alternate stream`);
    assert(station.description && station.tag, `${station.name} has a description and tag`);
    assert(["High energy", "Upbeat", "Chill"].includes(station.mood), `${station.name} has a known energy group`);
  }
});

test("next and previous stations wrap around the list", () => {
  const first = RADIO_STATIONS[0];
  const last = RADIO_STATIONS[RADIO_STATIONS.length - 1];
  assert.equal(adjacentStation(first.id, -1).id, last.id);
  assert.equal(adjacentStation(last.id, 1).id, first.id);
  assert.equal(adjacentStation("missing", 1).id, RADIO_STATIONS[1].id);
});

test("new profiles start on the default station and volume", () => {
  const settings = defaultProfile().settings;
  assert.deepEqual(settings.radio, { station: DEFAULT_RADIO_STATION, volume: DEFAULT_RADIO_VOLUME });
});
