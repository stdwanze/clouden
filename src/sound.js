CM.Sound = (function() {

    var sounds = {};
    var baseVolumes = {};
    var muted = false;

    function define(name, src, options) {
        baseVolumes[name] = options.volume !== undefined ? options.volume : 0.5;
        sounds[name] = new Howl(Object.assign({ src: src, volume: 0.5 }, options));
    }

    var walkSounds = ['walk_0', 'walk_1', 'walk_2'];
    var walkFrame = 0;
    var walkStep = 0;
    var WALK_INTERVAL = 18; // frames between footsteps

    function init() {
        define('shoot',      ['snd/shoot.ogg'],       { volume: 0.4 });
        define('shoot_blimp',['snd/shoot_blimp.ogg'],{ volume: 0.5 });
        define('collect',    ['snd/collect.ogg'],     { volume: 0.6 });
        define('hit',        ['snd/hit.ogg'],         { volume: 0.7 });
        define('die',        ['snd/die.ogg'],         { volume: 0.8 });
        define('mount',      ['snd/mount.ogg'],       { volume: 0.5 });
        define('dismount',   ['snd/dismount.ogg'],    { volume: 0.5 });
        define('blimp_hum',  ['snd/blimp_hum.ogg'],  { volume: 0.1, loop: true });
        define('walk_0',     ['snd/walk_0.ogg'],      { volume: 0.3 });
        define('walk_1',     ['snd/walk_1.ogg'],      { volume: 0.3 });
        define('walk_2',     ['snd/walk_2.ogg'],      { volume: 0.3 });
        define('enemy_shoot',  ['snd/enemy_shoot.ogg'],  { volume: 0.5 });
        define('enemy_hit',    ['snd/enemy_hit.ogg'],   { volume: 0.9 });
        define('enemy_idle',   ['snd/enemy_idle.ogg'],  { volume: 0.7, loop: true });
        define('dragon_idle',  ['snd/dragon_idle.ogg'], { volume: 0.6, loop: true });
        define('dragon_shoot', ['snd/dragon_shoot.ogg'],{ volume: 0.7 });
        define('dragon_walk',  ['snd/dragon_walk.ogg'], { volume: 0.8 });
        define('crab_idle',  ['snd/crab_idle.ogg'],   { volume: 0.5, loop: true });
        define('crab_attack',['snd/crab_attack.ogg'], { volume: 0.8 });
        define('crab_walk',  ['snd/crab_walk.ogg'],   { volume: 0.4 });
        define('music',      ['snd/music.ogg'],       { volume: 0.15, loop: true });
        define('mine_wood',  ['snd/mine_wood.wav'],   { volume: 0.7 });
        define('mine_stone', ['snd/mine_stone.wav'],  { volume: 0.8 });
    }

    function play(name) {
        if (muted) return;
        var s = sounds[name];
        if (s) s.play();
    }

    function stop(name) {
        var s = sounds[name];
        if (s) s.stop();
    }

    function footstep() {
        if (muted) return;
        walkFrame++;
        if (walkFrame >= WALK_INTERVAL) {
            walkFrame = 0;
            play(walkSounds[walkStep % walkSounds.length]);
            walkStep++;
        }
    }

    function resetFootstep() {
        walkFrame = 0;
    }

    var fuelWarnedAt = 0;
    var FUEL_WARN_INTERVAL = 10000;

    function fuelWarning(fuelScore) {
        if (muted) return;
        var pct = fuelScore.getScore() / fuelScore.getMax();
        if (pct < 0.4) {
            var now = Date.now();
            if (now - fuelWarnedAt >= FUEL_WARN_INTERVAL) {
                fuelWarnedAt = now;
                var u = new SpeechSynthesisUtterance('fuel low, refuel');
                u.rate = 0.85;
                u.pitch = 0.7;
                window.speechSynthesis.speak(u);
            }
        } else {
            fuelWarnedAt = 0; // reset so warning fires immediately next time it drops low
        }
    }

    function playAt(name, dist, maxDist, power) {
        if (muted) return;
        var s = sounds[name];
        if (!s) return;
        var factor = Math.pow(Math.max(0, 1 - dist / maxDist), power || 1);
        if (factor <= 0) return;
        var id = s.play();
        s.volume(baseVolumes[name] * factor, id);
    }

    // For looping sounds: call every frame. Returns the current sound id (pass it back next frame).
    function updateSpatialLoop(name, id, dist, maxDist, power) {
        var s = sounds[name];
        if (!s) return null;
        var factor = Math.pow(Math.max(0, 1 - dist / maxDist), power || 1);
        var targetVol = baseVolumes[name] * factor;
        if (muted || factor <= 0) {
            if (id != null && s.playing(id)) s.stop(id);
            return null;
        }
        if (id == null || !s.playing(id)) {
            s.volume(targetVol); // set before play so the new instance starts at the right volume
            id = s.play();
        } else {
            s.volume(targetVol, id);
        }
        return id;
    }

    // Synthesized wind sound via dedicated AudioContext
    var windCtx = null;
    var windNodes = null;

    function getWindCtx() {
        if (!windCtx) windCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (windCtx.state === 'suspended') windCtx.resume();
        return windCtx;
    }

    function startWind() {
        stopWind();
        if (muted) return;
        try {
            var ctx = getWindCtx();
            console.log('startWind ctx.state:', ctx.state);
            var sampleRate = ctx.sampleRate;
            var bufferSize = sampleRate * 3;
            var buffer = ctx.createBuffer(1, bufferSize, sampleRate);
            var data = buffer.getChannelData(0);
            for (var i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

            var source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            // Lowpass to remove harsh highs
            var lp = ctx.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = 800;
            lp.Q.value = 0.5;

            // Bandpass to emphasize wind whoosh frequency
            var bp = ctx.createBiquadFilter();
            bp.type = 'bandpass';
            bp.frequency.value = 200;
            bp.Q.value = 0.3;

            var gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 1.5);

            // Slow gain wobble for gusting effect
            var lfo = ctx.createOscillator();
            lfo.frequency.value = 0.15;
            var lfoGain = ctx.createGain();
            lfoGain.gain.value = 0.08;
            lfo.connect(lfoGain);
            lfoGain.connect(gain.gain);
            lfo.start(0);

            source.connect(lp);
            lp.connect(bp);
            bp.connect(gain);
            gain.connect(ctx.destination);
            source.start(0);

            windNodes = { source: source, gain: gain, lfo: lfo };
        } catch(e) { console.warn('startWind:', e); }
    }

    function stopWind() {
        if (!windNodes) return;
        try {
            var ctx = getWindCtx();
            var gain = windNodes.gain;
            var snap = windNodes;
            gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
            setTimeout(function() { try { snap.source.stop(); if(snap.lfo) snap.lfo.stop(); } catch(e) {} }, 900);
        } catch(e) {}
        windNodes = null;
    }

    function toggleMute() {
        muted = !muted;
        Howler.mute(muted);
        return muted;
    }

    function startMusic() {
        if (!sounds['music']) return;
        if (Howler.ctx && Howler.ctx.state !== 'running') {
            var unlock = function() {
                if (!muted) sounds['music'].play();
                document.removeEventListener('keydown', unlock);
                document.removeEventListener('mousedown', unlock);
            };
            document.addEventListener('keydown', unlock);
            document.addEventListener('mousedown', unlock);
        } else {
            if (!muted) sounds['music'].play();
        }
    }

    return { init: init, play: play, stop: stop, playAt: playAt, updateSpatialLoop: updateSpatialLoop, footstep: footstep, resetFootstep: resetFootstep, fuelWarning: fuelWarning, toggleMute: toggleMute, startMusic: startMusic, startWind: startWind, stopWind: stopWind };

})();
