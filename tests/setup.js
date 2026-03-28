// Mock Howl/Howler before sound.js loads (sound.js uses them at module level via IIFE)
global.Howl = class Howl {
  constructor(opts) { this._src = opts && opts.src; }
  play()        { return 1; }
  stop()        {}
  volume()      { return this; }
  playing()     { return false; }
};
global.Howler = { mute: () => {}, ctx: null };

// Mock jQuery ($) — used only in CM.Renderer constructor body (not at load time)
const mockCtx = {
  clearRect: () => {}, fillRect: () => {}, drawImage: () => {},
  fillText: () => {}, restore: () => {}, save: () => {},
  beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
  closePath: () => {}, fill: () => {},
  fillStyle: '', font: '', globalAlpha: 1, imageSmoothingEnabled: true,
};
const mockCanvas = { getContext: () => mockCtx, width: 1280, height: 800 };
global.$ = () => ({ 0: mockCanvas });

// Mock speechSynthesis (used in sound.js fuelWarning)
global.speechSynthesis = { speak: () => {}, cancel: () => {} };
global.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };

// Mock animation frame globals
global.requestAnimationFrame = () => {};
global.requestAnimFrame = () => {};

// Seed the CM namespace before any file reads window.CM
global.CM = {};

// Load all source files in the same order as index.htm
require('../src/globals');
require('../src/sound');
require('../src/imagerepo');
require('../src/simulations');
require('../src/objects');
require('../src/osd');
require('../src/inventory');
require('../src/mineable');
require('../src/blockhut');
require('../src/player');
require('../src/enemy');
require('../src/algos');
require('../src/world');
require('../src/app');
require('../src/renderer');
require('../src/onscreendoc');
require('../src/utils');
require('../src/saveload');
