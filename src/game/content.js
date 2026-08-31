/* ============================================================
   CONTENT — landmarks and world content
   ------------------------------------------------------------
   Where things are, and which world content is only open while a
   mission objective with the matching `unlocks` tag is unmet.
   The gate itself is Game.tagOpen() in gameplay.js.
   ============================================================ */
import { HOME } from '../world/props.js';

export const STATION = { x: -236, z: 140 };
export const MASSIF = { x: 0, z: 0 };

export const LANDMARKS = { home: HOME, station: STATION, massif: MASSIF };

export const CONTENT = [
  {
    at: 'station', radius: 12, unlocks: 'station', key: 'station',
    prompt: 'HOLD <kbd>E</kbd> — INTERROGATE LOCAL STORE'
  }
];
