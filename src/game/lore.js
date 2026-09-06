/* ============================================================
   LORE — codex, samples, missions
   ============================================================ */

export const CODEX = [
  {
    id: 'dossier', tag: 'DOSSIER', title: 'OPERATION HOLLOW', meta: 'MERIDIAN AUTHORITY · CLEARANCE COBALT',
    start: true,
    body: [
      `VANTAGE-3 sits on the floor of Anaximenes, 72.5° north, forty-five degrees west, near the north-west limb of the body. Anaximenes is an old crater: the rim is worn down to a low ring of ridges, broken in places, and the floor is a kilometre and a half below them, level and pocked with small craterlets. It is a place that looks like it has nowhere to hide. The sun never climbs higher than thirty degrees. Shadows here do not shorten at midday. They only turn.`,
      `The station reported nominal for six hundred and eleven days. On day six hundred and twelve it sent a single unscheduled burst — four seconds of carrier, no payload — and then nothing. That was two hundred and fourteen days ago.`,
      `You are the operator of K-9 "KESTREL", delivered by descent sled to a clear patch of floor a few hundred metres from the station. Your instructions are to survey, sample, restore the relay chain, and determine why VANTAGE-3 stopped talking.`,
      `You will notice that the dossier does not say what VANTAGE-3 was for.`
    ]
  },
  {
    id: 'geology', tag: 'GEOLOGY', title: 'THE FLOOR OF ANAXIMENES', meta: 'SURVEY PRIMER · REV 12',
    start: true,
    body: [
      `Regolith is not sand. It is powdered rock that has been shattered, welded, shattered again and salted with meteoritic iron over four billion years, with no water and no wind to round a single grain. Every particle is a splinter. It packs to about forty percent void, it holds a footprint indefinitely, and it will grind through a bearing seal in a season.`,
      `It is also electrostatically alive. Ultraviolet light knocks electrons off the dayside; the nightside charges negative from the solar wind. At the terminator the potential difference across a few metres of ground can exceed a kilovolt, and the finest fraction levitates. Apollo crews photographed the horizon glow and nobody has fully explained it since.`,
      `Drive gently. At one sixth of a gravity your wheels have one sixth of the grip, and a slope you would not notice on Earth will put you on your roof.`
    ]
  },
  {
    id: 'first-return', tag: 'FIELD NOTE', title: 'THE FIRST RETURN', meta: 'GPR · SUBSURFACE ECHO 001',
    body: [
      `The radar came back wrong on the very first sweep.`,
      `A buried boulder returns a single hard hyperbola. Ice returns a broad, low-velocity smear. What came back from four metres under the floor was a lattice — a repeating hexagonal return, coherent across the whole aperture, with internal voids.`,
      `Nothing forms hexagonal voids in regolith. Basalt columns do it in cooling lava on Earth, but this is not columnar and it is not basalt. The dielectric constant reads like glass.`,
      `Recommend excavation.`
    ]
  },
  {
    id: 'voids', tag: 'ANALYSIS', title: 'THE HOLLOW PIPES', meta: 'SAMPLE 007 · MASS SPEC + PETROGRAPHY',
    body: [
      `The sample is a hollow tube of local glass. Outer diameter 41 mm, wall 3 mm, interior smooth and unweathered. It is a fulgurite: the trace left when a very large current passes through loose silicate and fuses it into a pipe along its own path.`,
      `Fulgurites occur on Earth wherever lightning strikes sand. There is no lightning here. There is no atmosphere to hold a charge column.`,
      `The chemistry is local — the glass is made of the soil it sits in, so nothing arrived from outside. The current did.`,
      `Two findings I would like struck from the field record until we are on a secure link:`,
      `First, the pipes branch outward from a common origin under the central massif, in a hexagonal close-packed arrangement, over an area of at least nine square kilometres. That is not the shape a discharge makes when it is looking for a path. That is the shape it makes when the path is already there.`,
      `Second, the solar-flare glass on the exterior surface is thin. Cosmic-ray exposure dating puts the formation of these pipes at thirty-nine years before present, plus or minus four.`,
      `We have had people on this body for longer than that.`
    ]
  },
  {
    id: 'roster', tag: 'PERSONNEL', title: 'VANTAGE-3 CREW', meta: 'FOUR SOULS · ROTATION 7',
    body: [
      `LINDQVIST, A. — station lead, seismology. Third rotation. Wrote most of the logs.`,
      `FADIL, N. — power systems. Kept a correspondence game going with somebody in Geneva, one move per uplink window.`,
      `OYELARAN, K. — medical, and the only one qualified on the drill rig.`,
      `VESPA, R. — Authority liaison. No published field record. No published anything, in fact. Arrived with the last resupply and was not on the manifest.`,
      `All four are listed as MISSING. Not lost. The distinction is a legal one and the Authority has been careful about it.`
    ]
  },
  {
    id: 'log-early', tag: 'STATION LOG', title: 'SUN-DAY 6', meta: 'A. LINDQVIST · TRANSCRIPT',
    body: [
      `Ground motion is up again. Fadil has the geophone mast reading a steady tremor, nine seconds period, at two metres, which would be unremarkable at the terminator except that the terminator is one hundred and ninety kilometres away and moving away from us.`,
      `The tremor is not coming from the sun. It is coming from underneath.`,
      `Vespa asked me not to put that in the log. I told her the log is the log. She said something I have been thinking about since, which is: "the log is a transmission."`
    ]
  },
  {
    id: 'log-late', tag: 'STATION LOG', title: 'SUN-DAY 11', meta: 'A. LINDQVIST · TRANSCRIPT · PARTIAL',
    body: [
      `We dug down to a pipe today. Oyelaran took the rig out to the third marker and went through the skin at 3.9 metres.`,
      `The interior is not empty. There is a film on the inside wall, a few microns, and it rings. Strike the outer wall anywhere and the note holds. No decay that the microphone will register. In a vacuum, at minus one hundred and sixty degrees, a ring that does not die.`,
      `The whole network is one continuous resonator. Nine square kilometres of glass pipe, lined, buried four metres under a crater floor that has been geologically dead for three billion years.`,
      `Somebody lined a drum under the Moon.`,
      `Fadil did the arithmetic on the storage. He came back very quiet and asked me not to make him say the number out loud, so I will write it instead: if the network is wound to the tension we are measuring at the surface, it is holding somewhere between four and eleven petajoules.`,
      `That is not a strain observatory. That is a drum, or a bell, or a timer, and the difference has never been more than a matter of intent.`
    ]
  },
  {
    id: 'memo', tag: 'AUTHORITY', title: 'MEMORANDUM 44-C', meta: 'RECOVERED FROM RELAY CACHE · UNSENT',
    body: [
      `TO: Station Lead, VANTAGE-3`,
      `FROM: Authority Oversight, Meridian`,
      `RE: Cessation of unauthorised subsurface work`,
      `Your survey exceeds the scope of the crustal-strain charter under which VANTAGE-3 is licensed and insured. All excavation below two metres is to stop immediately. Instrumentation already emplaced in the formation is to be left in place and left powered.`,
      `For the avoidance of doubt: the formation was catalogued prior to your arrival. It is Authority property under the salvage provisions. Your crew was not selected for its discovery and will not be credited with it.`,
      `Liaison Vespa holds standing authority on all matters relating to the formation, including the authority to terminate the rotation early.`,
      `You are reminded that the station's power is drawn from a tap the Authority installed and the Authority maintains.`
    ]
  },
  {
    id: 'function', tag: 'ANALYSIS', title: 'WHAT IT IS FOR', meta: 'SAMPLE 019 · DEEP CORE, CENTRAL MASSIF',
    body: [
      `The deep core answers it.`,
      `The pipes are not a natural formation and they are not thirty-nine years old either. The pipes are thirty-nine years old. The *film inside them* is four billion.`,
      `Read that again, because I had to.`,
      `The lining is a mineral phase that does not appear in any lunar sample ever returned, and its crystallisation age sits within a hundred million years of the Moon's own formation. It was already in the rock, dispersed, dormant, a few parts per billion, everywhere under this basin.`,
      `Thirty-nine years ago somebody rang the ground, and the ringing found that mineral, and the mineral *assembled*. The fulgurite pipes are not the structure. They are the packaging the structure grew inside.`,
      `The Authority did not find a drum. They found a seed, and they struck it, and they have been watching it ring for four decades while telling four people at a time that they were monitoring strain.`
    ]
  },
  {
    id: 'lasthour', tag: 'STATION LOG', title: 'THE LAST HOUR', meta: 'A. LINDQVIST · UNSENT · RECOVERED FROM LOCAL STORE',
    body: [
      `The geophones are saturated and the dust is standing up off the ground outside the window — not blowing, there is nothing to blow it — standing, in columns, like the whole basin is holding its breath.`,
      `Vespa has locked out the tap. She is not hostile. She has been perfectly polite about it. She says the ringing is scheduled, that it has always been scheduled, that we were told and did not read the annex.`,
      `Fadil is trying to ground the hab to the drill string. Oyelaran is getting the suits.`,
      `If you are reading this you drove here, which means the relays are up, which means you can send. So send this, and send all of it, and do not let them tell you it was an equipment failure:`,
      `It is not a fault. It is a function. The basin is a drum and we are standing on the head, and somewhere there is a schedule with our names in the margin.`,
      `Sun-day 14. Lindqvist out. Tell my sister the rook was always hers.`
    ]
  },
  {
    id: 'drum', tag: 'FIELD NOTE', title: 'THE DRUMHEAD', meta: 'CENTRAL MASSIF · 11 m SUBSURFACE',
    body: [
      `It is warm.`,
      `Minus one hundred and sixty-one degrees on the surface, and the void reads minus ninety-four. Something down there has been dissipating energy continuously for two hundred and fourteen days.`,
      `The network rang out on sun-day 14. It took the station, and it took the crew, and it has spent every hour since doing exactly what a drumhead does after you strike it. Settling.`,
      `It is winding again.`,
      `Your drills. Your wheels. Every relay you planted. Every vibration you send in, the head takes, and the count goes on.`,
      `At the present rate it reaches the tension recorded in Lindqvist's last log in eleven months.`
    ]
  },
  {
    id: 'transmission', tag: 'ENDING', title: 'TRANSMISSION', meta: 'RELAY CHAIN NOMINAL · UPLINK WINDOW OPEN',
    body: [
      `The relays are up. Earth hangs over the northern rim, blue and half-lit and one and a quarter seconds away.`,
      `You have the crew logs, the sample analyses, the memo they never sent, and a timestamped record of a nine-square-kilometre glass drum ringing under a crater floor with four names still legally listed as missing.`,
      `The Authority maintains this uplink. The Authority will receive this first.`,
      `Lindqvist knew that, and wrote it down anyway, and then walked out to help Fadil ground the hab to a drill string, which was never going to work and which he did regardless.`,
      `K-9 KESTREL, Anaximenes, sun-day 214.`,
      `The knocking was never a signal. It is a count. It is counting something down. It started the day you landed.`,
      `Transmitting.`
    ]
  }
];

/* ---------------- sample taxonomy ---------------- */
export const SAMPLES = {
  cable: { name: 'GEOPHONE CABLE', rare: true, value: 4, desc: 'Tinned lead in a glass jacket, strung between the posts. The ends are clean-cut — not broken.', unlock: 'ls-posta' },
  core:  { name: 'MEMORY CORE', rare: true, value: 8, desc: 'Solid state. Every cycle accounted for. The last entry is a count.', unlock: 'ls-hub' },
  soil: { name: 'SURFACE SOIL', rare: false, value: 1, desc: 'Mature highland soil. 40 % void, 3 % meteoritic iron, agglutinate-rich.' },
  breccia: { name: 'IMPACT BRECCIA', rare: false, value: 2, desc: 'Shattered rock welded by shock. Someone else\'s crater, delivered here.' },
  ilmenite: { name: 'ILMENITE CONCENTRATE', rare: false, value: 2, desc: 'FeTiO₃. The reason anyone would ever want to own this basin.' },
  agglutinate: { name: 'AGGLUTINATE', rare: false, value: 2, desc: 'Soil welded to itself by micrometeorite glass. Pure lunar weathering.' },
  pyroclast: { name: 'PYROCLASTIC BEADS', rare: true, value: 4, desc: 'Orange volcanic glass. Fire-fountained from 400 km down, 3.6 Gy ago.' },
  meteoritic: { name: 'METEORITIC IRON', rare: true, value: 4, desc: 'Kamacite fragment. Arrived at eighteen kilometres per second.' },
  pipe: { name: 'HOLLOW PIPE', rare: true, value: 6, desc: 'Hollow fulgurite of local glass. Interior wall: unweathered. Lined.', unlock: 'voids' },
  lining: { name: 'THE LINE', rare: true, value: 8, desc: 'Micron-thick phase from a pipe interior. No measurable damping at 110 K. It rings.', unlock: 'function' },
  drum: { name: 'DRUMHEAD CORE', rare: true, value: 12, desc: 'Still warm. Still winding.', unlock: 'drum' },
  frost: { name: 'PALE FROST', rare: false, value: 1,
    desc: 'Ice frost in a pale highland soil. The plain is older than its cold.' },
  ring: { name: 'RESONANT LINING FIELD', rare: true, value: 8,
    desc: 'A 400-metre field of lining as floor. No pipes. It rings under every wheel that crosses it.', unlock: 'gm-ring' },
  flash: { name: 'IMPACT FLASH', rare: false, value: 2,
    desc: 'Bright fresh-impact mineral on a four-billion-year-old floor. The newest thing here is also the youngest.' },
  shard: { name: 'GLASS SHARD', rare: true, value: 8,
    desc: 'Fulgurite torn from a breakout. Dielectric matches Anaximenes pipe glass to four decimals. Same glass. Two systems.', unlock: 'call-field' },
  tap: { name: 'LISTENING TAP', rare: true, value: 5,
    desc: 'A geophone with a clean-cut lead. The last thing it heard was a count starting at a touchdown.', unlock: 'call-postb' }
};

/* ---------------- missions ----------------
   Objective DSL (consumed by Game in gameplay.js):
   - type 'distance' — state predicate, checked every frame:
       { type, ref: 'home'|'station'|'massif', op: '>'|'<', v, minH? }
   - type 'event'    — completed when the game emits `on`
       (optionally with a matching payload `special`):
       { type, on, special? }
   - type 'count'    — like 'event', but accumulates until `count`:
       { type, on, special?, count }
   - unlocks (optional) — world content that is only open while this
     objective is UNMET (Game.tagOpen); see content.js.
   Adding a mission is an edit to this array only. */
export const MISSIONS = [
  {
    id: 'firstpassage', tag: 'MISSION 01', name: 'FIRST PASSAGE',
    brief: `The sled is down and you are on the surface. Deploy the array, wake the drive train, and get a feel for one sixth of a gravity before you need it. Everything about this machine is tuned for a world that pulls harder than this one.`,
    objectives: [
      { id: 'deploy', type: 'event', on: 'array-deployed', text: 'Deploy the solar array', hint: 'press T' },
      { id: 'drive', type: 'distance', ref: 'home', op: '>', v: 120, text: 'Drive 120 m from the sled' },
      { id: 'scan', type: 'event', on: 'scan-done', text: 'Run one ground-penetrating radar sweep', hint: 'press G' }
    ]
  },
  {
    id: 'listening', tag: 'MISSION 02', name: 'THE LISTENING FLOOR',
    brief: `Your first sweep came back wrong. A coherent hexagonal structure under the floor, hollow returns coherent across the whole aperture — nothing natural holds that geometry. Find three subsurface returns and excavate them. Sweep, drive to the return, and put the drill through it.`,
    objectives: [
      { id: 'find3', type: 'count', on: 'sample', count: 3, text: 'Excavate 3 subsurface returns' },
      { id: 'home1', type: 'event', on: 'offload', text: 'Return the samples to the sled' }
    ]
  },
  {
    id: 'channel', tag: 'MISSION 03', name: 'OPEN CHANNEL',
    brief: `VANTAGE-3 sat in a bowl with no line of sight to Earth, which is a strange place to build an observatory and a convenient place to lose one. Earth never clears the rim from down here. Plant three relays on high ground — the terraces under the wall, or the massif — to open an uplink.`,
    objectives: [
      { id: 'relays', type: 'count', on: 'relay', count: 3, text: 'Deploy 3 relays on high ground', hint: 'press B on ground above 10 m, 95 m apart' }
    ]
  },
  {
    id: 'quiet', tag: 'MISSION 04', name: 'THE QUIET STATION',
    brief: `VANTAGE-3 is two hundred and seventy metres west-northwest, across the rim break. There is one crossing, where the wall collapsed into the floor — everywhere else it stands past the repose angle and you will not come back out. Get inside the perimeter and pull whatever is left of the local store. Mind the scorch ring: the ground there is glass under a centimetre of dust.`,
    objectives: [
      { id: 'reach', type: 'distance', ref: 'station', op: '<', v: 26, text: 'Reach VANTAGE-3' },
      { id: 'recover', type: 'event', on: 'station-interact', unlocks: 'station', text: 'Recover the crew logs', hint: 'hold E at the airlock' }
    ]
  },
  {
    id: 'knock', tag: 'MISSION 05', name: 'THE KNOCK',
    brief: `Everything in the network radiates from one point under the central massif. Drive up, drill deep, and find out what has been keeping itself warm for two hundred and fourteen days.`,
    objectives: [
      { id: 'massif', type: 'distance', ref: 'massif', op: '<', v: 46, minH: 12, text: 'Reach the central massif' },
      { id: 'deep', type: 'event', on: 'extract', special: 'drum', unlocks: 'drum', text: 'Extract the drumhead core' },
      { id: 'transmit', type: 'event', on: 'transmit', text: 'Return to the sled and transmit' }
    ]
  }
];

/* Shown by Game.advance() when the campaign is exhausted — data, not code. */
export const ENDING_CARD = {
  tag: 'OPERATION HOLLOW', name: 'COUNTING',
  brief: `The uplink closed forty seconds ago. Whatever happens to the record now happens on Earth, in a building with a lobby and a receptionist and a legal department.\n\nYou are still here. The basin is still here. Under your wheels, four metres down, nine square kilometres of glass pipe is drawing motion at a rate you measured yourself.\n\nEleven months.`,
  objectives: [{ id: '_', text: 'Free survey unlocked — the basin is yours' }]
};
