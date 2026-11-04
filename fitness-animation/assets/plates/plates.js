/*
 * Plate manifest: every figure the episodes can use.
 *   src      path relative to engine/player.html
 *   w, h     pixel size of the image (the region paths use these coordinates)
 *   regions  SVG path data for muscle groups that can light up red
 *
 * Add your own: drop a PNG/WebP figure on transparent or black background in this
 * folder, add an entry, and draw regions in the image's own pixel coordinates
 * (open the image in any editor that shows cursor x/y, or use tools/grid.py).
 *
 * The three demo figures are cut from Paul Richer, "Anatomie artistique" (Paris, 1890),
 * vol. 2, public domain. Scans: Wikimedia Commons, Category:Anatomie artistique (Paul Richer).
 */
Object.assign(Motion.plates, {
  'arm-front': {
    src: '../assets/plates/arm-front.webp', w: 896, h: 2200,
    credit: 'Paul Richer, Anatomie artistique (1890), vol. 2, pl. 59. Commons: "Richer - Anatomie artistique, 2 p. 66.png". Public domain.',
    // forearm flexors (elbow -> wrist), flexor tendons through the palm, and the fingers
    regions: {
      flexors: 'M500,1090 L590,1010 L690,1000 L742,1060 L722,1150 L690,1232 L640,1332 L560,1455 L490,1565 L432,1655 L398,1700 L328,1700 L304,1640 L336,1560 L380,1450 L420,1330 L452,1200 Z',
      tendons: 'M300,1630 L432,1648 L426,1740 L402,1860 L330,1892 L240,1882 L226,1790 L262,1700 Z',
      fingers: 'M166,1890 L406,1884 L396,1990 L362,2082 L302,2172 L230,2182 L170,2160 L160,2000 Z',
      grip: 'M500,1090 L590,1010 L690,1000 L742,1060 L722,1150 L690,1232 L640,1332 L560,1455 L490,1565 L432,1655 L426,1740 L402,1860 L396,1990 L362,2082 L302,2172 L230,2182 L170,2160 L160,2000 L166,1890 L226,1790 L262,1700 L304,1640 L336,1560 L380,1450 L420,1330 L452,1200 Z',
    },
  },
  'torso-front': {
    src: '../assets/plates/torso-front.webp', w: 1115, h: 2200,
    credit: 'Paul Richer, Anatomie artistique (1890), vol. 2, pl. 53. Commons: "Richer - Anatomie artistique, 2 p. 60.png". Public domain.',
    regions: {
      pecs: 'M280,670 L540,690 L545,1065 L400,1065 L250,1015 L140,965 L190,850 Z M830,670 L570,690 L565,1065 L710,1065 L860,1015 L975,965 L925,850 Z',
    },
  },
  'torso-side': {
    src: '../assets/plates/torso-side.webp', w: 713, h: 2200,
    credit: 'Paul Richer, Anatomie artistique (1890), vol. 2. Commons: "Richer - Anatomie artistique, 2 p. 62.png". Public domain.',
    regions: {},
  },
});
