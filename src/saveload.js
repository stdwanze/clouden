CM = window.CM || {};

CM.SaveLoad = (function() {
    var STORAGE_KEY = 'clouden_save_v3';

    // Image key lookup for reconstructing collectables on load
    var COLLECTABLE_IMAGE = {
        COINS:   'coin_10',
        AMMO:    'ammo_10',
        HEALTH:  'health_10',
        FUEL:    'fuel_10',
        CRYSTAL: 'crystal',
        SKYMAP:  'skymap',
    };

    var MINEABLE_IMAGE = {
        STONE: 'mineable_rock',
        WOOD:  'mineable_tree',
        REED:  null,
        BERRY_RED:  null,
        BERRY_BLUE: null,
    };

    // Called BEFORE world creation — returns saved seed or null.
    function getSavedSeed() {
        var json = localStorage.getItem(STORAGE_KEY);
        if (!json) return null;
        try {
            var state = JSON.parse(json);
            return (state && state.v === 3 && state.seed != null) ? state.seed : null;
        } catch(e) { return null; }
    }

    function save(engine) {
        var player = engine.player;

        var scores = {};
        player.getScores().getAll().forEach(function(s) {
            scores[s.getName()] = s.getScore();
            scores[s.getName() + '_max'] = s.getMax();
        });

        var mineables = [];
        var collectables = [];
        var blimps = [];
        var blockhuts = [];
        var vogelscheuchen = [];
        var npcs = [];

        engine.world.getObjects().forEach(function(obj) {
            if (obj.isNPC) {
                npcs.push({ questIndex: obj.questIndex, questAccepted: obj.questAccepted });
            } else if (obj.isScarecrow) {
                vogelscheuchen.push({ x: obj.position.x, y: obj.position.y });
            } else if (obj.isSafePoint) {
                blockhuts.push({ x: obj.position.x, y: obj.position.y, hasBed: obj.hasBed, hasCraftingStation: obj.hasCraftingStation });
            } else if (obj.mineable) {
                mineables.push({
                    x: obj.position.x, y: obj.position.y,
                    resourceType: obj.resourceType,
                    classType: obj.classType || null,
                    hitsReceived: obj.hitsReceived,
                    hitsRequired: obj.hitsRequired
                });
            } else if (obj.collectable) {
                collectables.push({
                    x: obj.position.x, y: obj.position.y,
                    typeName: obj.typeName,
                    pointvalue: obj.pointvalue,
                    scale: obj.scalingfactor
                });
            } else if (obj.interactable && obj.scores && obj.scores.get('FUEL')) {
                blimps.push({
                    x: obj.position.x, y: obj.position.y,
                    z: obj.z,
                    fuel:   obj.scores.get('FUEL').getScore(),
                    ammo:   obj.scores.get('AMMO').getScore(),
                    health: obj.scores.get('HEALTH').getScore()
                });
            }
        });

        var shrines = [];
        engine.world.getObjects().forEach(function(obj) {
            if (obj.isShrine) {
                shrines.push({ x: obj.position.x, y: obj.position.y, used: obj.used, buffType: obj.buffType });
            }
        });

        var caveCollectables = [];
        if (engine.caveWorld) {
            engine.caveWorld.getObjects().forEach(function(obj) {
                if (obj.collectable) {
                    caveCollectables.push({
                        x: obj.position.x, y: obj.position.y,
                        typeName: obj.typeName,
                        pointvalue: obj.pointvalue,
                        scale: obj.scalingfactor
                    });
                }
            });
        }

        var state = {
            v: 3,
            seed: CM.currentSeed,
            blimpFuelBonus: engine.blimpFuelBonus || 0,
            player: {
                x: player.position.x, y: player.position.y,
                z: player.z, scores: scores, bowLevel: player.bowLevel
            },
            inventory:    engine.inventory.slots,
            mineables:       mineables,
            collectables:    collectables,
            blimps:          blimps,
            blockhuts:        blockhuts,
            vogelscheuchen:   vogelscheuchen,
            npcs:             npcs,
            shrines: shrines,
            cave: {
                skyMapFound:   !!CM.skyMapFound,
                skyMapSpawned: !!CM.skyMapSpawned,
                collectables:  caveCollectables,
            }
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    }

    function load(engine) {
        var json = localStorage.getItem(STORAGE_KEY);
        if (!json) return false;

        var state;
        try { state = JSON.parse(json); } catch(e) { return false; }
        if (!state || state.v !== 3) return false;

        var player = engine.player;

        // --- Player ---
        var px = state.player.x, py = state.player.y;
        player.position.x = px;          player.position.y = py;
        player.spriteright.position.x = px; player.spriteright.position.y = py;
        player.spriteleft.position.x  = px; player.spriteleft.position.y  = py;
        player.z = state.player.z;
        player.bowLevel = state.player.bowLevel || 0;

        var savedScores = state.player.scores;
        player.getScores().getAll().forEach(function(s) {
            if (savedScores[s.getName() + '_max'] !== undefined) s.max = savedScores[s.getName() + '_max'];
            if (savedScores[s.getName()] !== undefined) s.score = savedScores[s.getName()];
        });

        // --- Inventory ---
        engine.inventory.slots = state.inventory;

        // --- Mineables ---
        engine.world.objects = engine.world.objects.filter(function(o) { return !o.mineable; });
        (state.mineables || []).forEach(function(m) {
            var pos = new CM.Point(m.x, m.y);
            var obj;
            if (m.classType === 'Reed') {
                obj = new CM.Reed(pos);
            } else if (m.classType === 'BerryBush') {
                obj = new CM.BerryBush(pos, m.resourceType);
            } else {
                var img = engine.imagerepo.getImage(MINEABLE_IMAGE[m.resourceType]);
                obj = new CM.Mineable(pos, m.resourceType, img);
            }
            obj.hitsReceived = m.hitsReceived || 0;
            obj.hitsRequired = m.hitsRequired;
            obj.setRemover(engine.world.removeObject.bind(engine.world));
            engine.world.addObject(obj);
        });

        // --- Collectables ---
        engine.world.objects = engine.world.objects.filter(function(o) { return !o.collectable; });
        (state.collectables || []).forEach(function(c) {
            var imgKey = COLLECTABLE_IMAGE[c.typeName];
            if (!imgKey) return;
            var img = engine.imagerepo.getImage(imgKey);
            engine.world.addObject(new CM.Collectable(
                new CM.Point(c.x, c.y), img, c.typeName, c.pointvalue, c.scale
            ));
        });

        // --- Blimp ---
        engine.world.objects = engine.world.objects.filter(function(o) {
            return !(o.interactable && o.scores && o.scores.get('FUEL'));
        });
        (state.blimps || []).forEach(function(b) {
            var blimp = new CM.Blimp(new CM.Point(b.x, b.y), engine.imagerepo.getImage('blimp'));
            blimp.z = b.z;
            blimp.scores.get('FUEL').score   = b.fuel;
            blimp.scores.get('AMMO').score   = b.ammo;
            blimp.scores.get('HEALTH').score = b.health;
            engine.world.addObject(blimp);
        });

        // --- Blockhuts ---
        engine.world.objects = engine.world.objects.filter(function(o) { return !o.isSafePoint; });
        (state.blockhuts || []).forEach(function(b) {
            var hut = new CM.Blockhut(new CM.Point(b.x, b.y));
            hut.hasBed = !!b.hasBed;
            hut.hasCraftingStation = !!b.hasCraftingStation;
            engine.world.addObject(hut);
        });

        // --- Vogelscheuchen ---
        engine.world.objects = engine.world.objects.filter(function(o) { return !o.isScarecrow; });
        (state.vogelscheuchen || []).forEach(function(v) {
            engine.world.addObject(new CM.Vogelscheuche(new CM.Point(v.x, v.y)));
        });

        // --- Cave state ---
        if (state.cave) {
            CM.skyMapFound   = !!state.cave.skyMapFound;
            CM.skyMapSpawned = !!state.cave.skyMapSpawned;
            if (engine.caveWorld && state.cave.collectables) {
                engine.caveWorld.objects = engine.caveWorld.objects.filter(function(o) { return !o.collectable; });
                state.cave.collectables.forEach(function(c) {
                    var imgKey = COLLECTABLE_IMAGE[c.typeName];
                    if (!imgKey) return;
                    engine.caveWorld.addObject(new CM.Collectable(
                        new CM.Point(c.x, c.y),
                        engine.imagerepo.getImage(imgKey),
                        c.typeName, c.pointvalue, c.scale
                    ));
                });
            }
        }

        // --- NPCs ---
        var npcObjects = engine.world.getObjects().filter(function(o) { return o.isNPC; });
        (state.npcs || []).forEach(function(n, i) {
            if (npcObjects[i]) {
                npcObjects[i].questIndex    = n.questIndex    || 0;
                npcObjects[i].questAccepted = !!n.questAccepted;
            }
        });

        // --- Blimp fuel bonus ---
        engine.blimpFuelBonus = state.blimpFuelBonus || 0;
        if (engine.blimpFuelBonus > 0) {
            var bonusBlimp = engine.world.getObjects().find(function(o) {
                return o.scores && o.scores.get('FUEL');
            });
            if (bonusBlimp) bonusBlimp.scores.get('FUEL').max += engine.blimpFuelBonus;
        }

        // --- Shrines ---
        if (state.shrines) {
            var shrineObjects = engine.world.getObjects().filter(function(o) { return o.isShrine; });
            state.shrines.forEach(function(s) {
                var match = shrineObjects.find(function(o) {
                    return Math.abs(o.position.x - s.x) < 5 && Math.abs(o.position.y - s.y) < 5;
                });
                if (match) {
                    match.used = !!s.used;
                    match.buffType = s.buffType;
                }
            });
        }

        return true;
    }

    function clear() {
        localStorage.removeItem(STORAGE_KEY);
    }

    return { save: save, load: load, clear: clear, getSavedSeed: getSavedSeed };
})();
