CM = window.CM || {};
CM.GroundLevel = 2.5;
CM.SkyLevel = 1.75;
CM.Max = 1;

CM.currentSeed = null;

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