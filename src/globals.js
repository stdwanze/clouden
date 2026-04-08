CM = window.CM || {};
CM.GroundLevel = 2.5;
CM.FloatLevel  = 1.85; // z-level of floating islands (between ground and sky)
CM.SkyLevel = 1.75;
CM.Max = 1;

CM.WindLayers = [
    { zMin: CM.SkyLevel + 0.35, zMax: CM.GroundLevel,     wind: { x: -0.06, y:  0.02 } }, // niedrig: SW
    { zMin: CM.Max + 0.4,       zMax: CM.SkyLevel + 0.35, wind: { x:  0.08, y:  0.04 } }, // mittel: SO
    { zMin: CM.Max,             zMax: CM.Max + 0.4,        wind: { x: -0.12, y:  0.0  } }, // hoch: W
];

CM.CaveLevel = 3.5;
CM.skyMapFound = false;
CM.skyMapSpawned = false;
CM.caveEntrancePositions = [];

CM.currentSeed = null;
CM.gamepadActive = false;

// Default: unseeded (replaced by initRng before world creation)
CM.rng = Math.random.bind(Math);

// Seeded xorshift32 PRNG — call before world creation to make generation reproducible.
CM.initRng = function(seed) {
    CM.currentSeed = seed;
    var s = ((seed * 0xFFFFFFFF) | 0) || 1;
    s = s >>> 0;
    CM.rng = function() {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s = s >>> 0;
        return s / 4294967296;
    };
};