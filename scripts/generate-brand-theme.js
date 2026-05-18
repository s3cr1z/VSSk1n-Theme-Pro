#!/usr/bin/env node
/**
 * Brand theme generator.
 *
 * Reads the canonical Lynx Dark (01_Lynx-Dark-theme.json) and Lynx Light
 * (02_Lynx-Light-theme.json) templates, then for every brand declared in
 * `brand-configs.js` it emits two derived theme files:
 *
 *   src/themes/brands/{slug}/{slug}-dark-theme.json
 *   src/themes/brands/{slug}/{slug}-light-theme.json
 *
 * The generator preserves the full 450+ color-key UI coverage, the
 * `semanticTokenColors` structure with all font styles, and the entire
 * `tokenColors` syntax-token rule set from the base template — only swapping
 * the colors that drive the brand identity (workbench accent, surface tints,
 * borders, muted UI text) and the function color in syntax highlighting.
 *
 * Error / warning / info semantic colors (red, yellow, blue) are kept
 * unchanged across every brand to preserve diagnostic legibility, in line
 * with the design guidelines documented in ARCHITECTURE.md and CONTRIBUTING.md.
 *
 * Usage:
 *   node scripts/generate-brand-theme.js
 *
 * This script is dev-only and excluded from the VSIX bundle via .vscodeignore.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const brands = require('./brand-configs.js');

// =============================================================================
// Color utilities
// =============================================================================

function normalizeHex(hex) {
  if (typeof hex !== 'string') {
    throw new Error(`Expected hex string, got ${typeof hex}: ${hex}`);
  }
  let h = hex.trim().toLowerCase();
  if (h.startsWith('#')) {
    h = h.slice(1);
  }
  if (h.length === 3) {
    h = h.split('').map((c) => c + c).join('');
  }
  if (h.length !== 6 && h.length !== 8) {
    throw new Error(`Invalid hex: ${hex}`);
  }
  return '#' + h;
}

function hexToRgb(hex) {
  const h = normalizeHex(hex).slice(1, 7);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const hex = (v) => clamp(v).toString(16).padStart(2, '0');
  return '#' + hex(r) + hex(g) + hex(b);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  l = Math.max(0, Math.min(1, l));

  if (s === 0) {
    const v = l * 255;
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;
  return [
    hue2rgb(p, q, hk + 1 / 3) * 255,
    hue2rgb(p, q, hk) * 255,
    hue2rgb(p, q, hk - 1 / 3) * 255,
  ];
}

function hexToHsl(hex) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h, s, l) {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

function adjustLightness(hex, delta) {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, s, l + delta);
}

function setLightness(hex, l) {
  const [h, s] = hexToHsl(hex);
  return hslToHex(h, s, l);
}

function setSaturationLightness(hex, s, l) {
  const [h] = hexToHsl(hex);
  return hslToHex(h, s, l);
}

function mixHex(hexA, hexB, ratio) {
  // ratio = 0 → all A; ratio = 1 → all B
  const [r1, g1, b1] = hexToRgb(hexA);
  const [r2, g2, b2] = hexToRgb(hexB);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  );
}

function withAlpha(hex, alphaHex) {
  // alphaHex is a two-character hex string like '30'
  return normalizeHex(hex).slice(0, 7) + alphaHex.toLowerCase();
}

function relativeLuminance(hex) {
  // WCAG relative luminance
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hexA, hexB) {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

// =============================================================================
// JSONC helpers
//
// The Lynx base templates are JSON-with-comments. We strip comments and any
// trailing commas before parsing so we can safely round-trip through
// JSON.parse / JSON.stringify.
// =============================================================================

function stripJsonComments(input) {
  let out = '';
  let i = 0;
  let inString = false;
  let stringChar = '';
  while (i < input.length) {
    const c = input[i];
    const next = i + 1 < input.length ? input[i + 1] : '';
    if (inString) {
      if (c === '\\') {
        out += c + (next || '');
        i += 2;
        continue;
      }
      out += c;
      if (c === stringChar) {
        inString = false;
      }
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      inString = true;
      stringChar = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < input.length && input[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < input.length && !(input[i] === '*' && input[i + 1] === '/')) {
        i += 1;
      }
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function stripTrailingCommas(input) {
  return input.replace(/,(\s*[}\]])/g, '$1');
}

function parseJsonc(input) {
  return JSON.parse(stripTrailingCommas(stripJsonComments(input)));
}

// =============================================================================
// Color-map builders
//
// The maps below take every hex value present in the canonical Lynx template
// and explicitly route it to a brand-derived hex value. Keys are lowercase
// 6-digit hex; alpha is handled separately by `mapColor`.
// =============================================================================

function buildDarkPalette(cfg) {
  const accent = normalizeHex(cfg.accent);
  const secondary = normalizeHex(cfg.secondary);
  const darkBg = normalizeHex(cfg.darkBg);
  const darkEditorBg = normalizeHex(cfg.darkEditorBg);

  const [accentH, accentS] = hexToHsl(accent);
  const accentL = hexToHsl(accent)[2];

  // Brand accent ramp
  const accentBright = adjustLightness(accent, Math.min(0.15, 0.95 - accentL));
  const accentSoft = adjustLightness(accent, -0.05);
  const accentDeep = adjustLightness(accent, -0.12);
  const accentDeeper = adjustLightness(accent, -0.18);
  const accentDarker = adjustLightness(accent, -0.25);
  const accentVeryDark = setSaturationLightness(accent, Math.max(accentS, 0.45), 0.22);
  const accentNearBlack = setSaturationLightness(accent, Math.max(accentS, 0.5), 0.05);

  // Surface ramp anchored on the brand's dark background
  const bgEditor = darkEditorBg;
  const bgPrimary = darkBg;
  const bgDarkest = setLightness(darkBg, Math.max(0, hexToHsl(darkBg)[2] - 0.02));
  const bgElevated = setLightness(darkBg, Math.min(1, hexToHsl(darkBg)[2] + 0.025));
  const bgRaised = setLightness(darkBg, Math.min(1, hexToHsl(darkBg)[2] + 0.045));
  const bgHovered = setLightness(darkBg, Math.min(1, hexToHsl(darkBg)[2] + 0.065));
  const bgFocused = setLightness(darkBg, Math.min(1, hexToHsl(darkBg)[2] + 0.085));

  // Borders & dividers: shift toward the brand accent at very low lightness
  const borderAccent = mixHex(bgPrimary, accent, 0.20);
  const borderSubtle = mixHex(bgPrimary, accent, 0.12);
  const borderFaint = mixHex(bgPrimary, accent, 0.08);

  // Muted greens in the source become muted brand-tinted text
  const fgMuted = setSaturationLightness(accent, 0.18, 0.34);
  const fgMutedDarker = setSaturationLightness(accent, 0.16, 0.26);
  const fgVeryMuted = setSaturationLightness(accent, 0.14, 0.20);
  const fgMutedLight = setSaturationLightness(accent, 0.18, 0.45);
  const fgPunctuation = setSaturationLightness(accent, 0.16, 0.38);

  return {
    accent, accentBright, accentSoft, accentDeep, accentDeeper, accentDarker,
    accentVeryDark, accentNearBlack,
    bgEditor, bgPrimary, bgDarkest, bgElevated, bgRaised, bgHovered, bgFocused,
    borderAccent, borderSubtle, borderFaint,
    fgMuted, fgMutedDarker, fgVeryMuted, fgMutedLight, fgPunctuation,
    secondary,
  };
}

function buildDarkColorMap(cfg) {
  const p = buildDarkPalette(cfg);

  // Note: keys MUST be lowercase 6-digit hex (no '#'? no, with '#'). They are
  // matched verbatim by `mapColor`. 8-digit values are matched as base+alpha.
  return {
    // ---- Primary accent ----
    '#00d882': p.accent,
    '#00ff9d': p.accentBright,
    '#00b86e': p.accentDeep,
    '#08a969': p.accentDeep,
    '#009960': p.accentDeeper,
    '#00c87a': p.accentSoft,

    // Button text (almost black, derived from accent at very low L)
    '#040a06': p.accentNearBlack,
    '#020a04': p.accentNearBlack,

    // ---- Surfaces ----
    '#080c09': p.bgPrimary,
    '#060806': p.bgDarkest,
    '#0a0c0a': p.bgDarkest,
    '#090c0a': p.bgPrimary,
    '#0b1410': p.bgElevated,
    '#0b140c': p.bgElevated,
    '#0d1a10': p.bgRaised,
    '#0a1810': p.bgRaised,
    '#0a1c12': p.bgRaised,
    '#0f1c14': p.bgHovered,
    '#0f2018': p.bgRaised,
    '#111611': p.bgHovered,
    '#1a3028': p.bgFocused,
    '#0a1410': p.bgElevated,

    // ---- Borders ----
    '#1a3d26': p.borderAccent,
    '#1a3020': p.borderSubtle,
    '#1e3d28': p.borderSubtle,
    '#1e4a30': p.accentDarker,
    '#1a4830': p.accentDarker,
    '#285a3c': p.accentDeeper,

    // ---- Muted greens (text-ish) ----
    '#2e4a38': p.fgMutedDarker,
    '#3d5c48': p.fgMuted,
    '#4a7060': p.fgPunctuation,
    '#5a7a64': p.fgMuted,
    '#5a8070': p.fgMuted,
    '#6a8a74': p.fgMutedLight,
    '#6a8a78': p.fgMutedLight,
    '#8ab0a0': mixHex(p.fgMutedLight, '#c8dcd0', 0.4),
    '#8ea898': mixHex(p.fgMutedLight, '#c8dcd0', 0.5),
    '#2e5a40': p.accentDarker,
    '#2e6a4a': p.fgMutedLight,
    '#3a4a3a': p.fgMutedDarker,

    // ---- Foregrounds (kept neutral) ----
    '#d4ead8': '#d4ead8',
    '#c8dcd0': '#c8dcd0',
    '#e8f0ec': '#e8f0ec',
    '#b8ccbe': '#b8ccbe',
    '#b8ccc0': '#b8ccc0',

    // ---- Subtle / specialty accent-bg ----
    '#050e07': p.bgDarkest,
    '#100820': p.bgDarkest,
    '#001a10': p.accentNearBlack,
  };
}

function buildLightPalette(cfg) {
  const accent = normalizeHex(cfg.accent);
  const secondary = normalizeHex(cfg.secondary);
  const lightBg = normalizeHex(cfg.lightBg);
  const lightEditorBg = normalizeHex(cfg.lightEditorBg);

  const [accentH, accentS] = hexToHsl(accent);
  const accentL = hexToHsl(accent)[2];

  const accentBright = adjustLightness(accent, Math.max(-0.10, 0.18 - accentL));
  const accentDeep = adjustLightness(accent, -0.10);
  const accentDeeper = adjustLightness(accent, -0.18);
  const accentSoft = adjustLightness(accent, 0.06);

  // Light surfaces
  const bgEditor = lightEditorBg;
  const bgPrimary = lightBg;
  const bgDarker = setLightness(lightBg, Math.max(0, hexToHsl(lightBg)[2] - 0.04));
  const bgLighter = setLightness(lightBg, Math.min(1, hexToHsl(lightBg)[2] + 0.03));
  const bgTinted = mixHex(lightBg, accent, 0.05);
  const bgTintedHover = mixHex(lightBg, accent, 0.08);

  // Borders for light
  const borderAccent = mixHex(lightBg, accent, 0.30);
  const borderSubtle = mixHex(lightBg, accent, 0.20);
  const borderFaint = mixHex(lightBg, accent, 0.10);

  // Muted text greys for light variant
  const fgMuted = setSaturationLightness(accent, 0.18, 0.45);
  const fgVeryMuted = setSaturationLightness(accent, 0.12, 0.62);

  return {
    accent, accentBright, accentDeep, accentDeeper, accentSoft,
    bgEditor, bgPrimary, bgDarker, bgLighter, bgTinted, bgTintedHover,
    borderAccent, borderSubtle, borderFaint,
    fgMuted, fgVeryMuted,
    secondary,
  };
}

function buildLightColorMap(cfg) {
  const p = buildLightPalette(cfg);

  return {
    // ---- Primary accent (base template green) ----
    '#479671': p.accent,
    '#347534': p.accentDeep,
    '#3a9a3a': p.accentDeep,
    '#408164': p.accentDeep,
    '#06da62': p.accentBright,
    '#038c43': p.accentDeeper,
    '#22c55e': p.accent,
    '#0d9488': p.accentDeep,
    '#0cd47a': p.accent, // function-name token color (also handled below)
    '#5fc05c': p.accentBright,
    '#4fc68e': p.accent,
    '#469b8b': p.accent,
    '#629742': p.accentDeep,
    '#4d7a26': p.accentDeeper,
    '#669933': p.accentDeep,
    '#7ab897': p.accentBright,
    '#4b8360': p.accentDeep,
    '#65d565': p.accentBright,
    '#55c555': p.accentBright,
    '#55d555': p.accentBright,
    '#031b4e': p.accentDeeper,

    // ---- Light surfaces ----
    '#f4f4f4': p.bgEditor,
    '#f5f5f5': p.bgPrimary,
    '#eaeaea': p.bgDarker,
    '#e5e5e5': p.bgDarker,
    '#d9d9d9': p.bgDarker,
    '#cccccc': p.borderFaint,
    '#ffffff': '#ffffff',
    '#f0f5f0': p.bgTinted,
    '#f5faf5': p.bgTinted,
    '#e5f0e5': p.bgTintedHover,
    '#eff5f0': p.bgTintedHover,
    '#d0e0d5': p.bgTintedHover,
    '#d0e0d4': p.bgTintedHover,
    '#e0f0e0': p.bgTintedHover,

    // ---- Borders ----
    '#c0d0c0': p.borderSubtle,
    '#c0d0c3': p.borderSubtle,
    '#c5d5c5': p.borderSubtle,
    '#b0c0b0': p.borderSubtle,
    '#b0c0b5': p.borderSubtle,
    '#a5a5a5': p.borderFaint,

    // ---- Muted text greys ----
    '#2d3d2d': '#1f1f1f',
    '#2d2d2d': '#1f1f1f',
    '#1a1a1a': '#1a1a1a',
    '#4d5a5d': p.fgMuted,
    '#8a9a8a': p.fgVeryMuted,
    '#656a65': p.fgMuted,
    '#9aaa9a': p.fgVeryMuted,
    '#a5b5a5': p.fgVeryMuted,
    '#6a7a6a': p.fgMuted,
    '#b3bcbb': p.fgVeryMuted,
    '#61616f': p.fgMuted,
    '#616161': p.fgMuted,
    '#5a7a5a': p.fgMuted,
    '#788494': p.fgMuted,
    '#5a5a5a': p.fgMuted,
  };
}

// =============================================================================
// Color application
// =============================================================================

function mapColor(value, colorMap) {
  if (typeof value !== 'string') return value;
  if (!value.startsWith('#')) return value;
  const lower = value.toLowerCase();
  if (colorMap[lower]) return colorMap[lower];
  // Handle alpha (#RRGGBBAA → look up #RRGGBB, reattach alpha)
  if (lower.length === 9) {
    const base = lower.slice(0, 7);
    const alpha = lower.slice(7);
    if (colorMap[base]) {
      return colorMap[base] + alpha;
    }
  }
  return value;
}

function applyColorMapToColors(colorsObj, colorMap) {
  const out = {};
  for (const [key, value] of Object.entries(colorsObj)) {
    out[key] = mapColor(value, colorMap);
  }
  return out;
}

// =============================================================================
// Function-color swap for tokenColors and semanticTokenColors
//
// Per the design spec: tokenColors and semanticTokenColors are kept identical
// to the base template for syntax legibility. Only the accent green that drives
// the function color is swapped to the brand accent.
//
// In the Dark template that green is `#00d882`. In the Light template the
// dedicated function-name color is `#0cd47a` and the function semantic
// foreground is `#2563EB`; we swap both so that the brand accent is what users
// see for function declarations.
// =============================================================================

const DARK_FUNCTION_SOURCE = '#00d882';
const LIGHT_FUNCTION_SOURCES = new Set(['#0cd47a']);
const LIGHT_FUNCTION_SEMANTIC_KEYS = new Set(['function']);

// Comment colors in the base templates that should be re-tinted to the brand
// hue per Design Principle #2 (comment dimming, brand-aware tint).
//  Dark template: #1e4a30 (line/block), #285a3c (documentation)
//  Light template: #8c929a (line/block), #7c828a (documentation)
const DARK_COMMENT_SOURCES = new Set(['#1e4a30', '#285a3c']);
const LIGHT_COMMENT_SOURCES = new Set(['#8c929a', '#7c828a']);

function swapDarkFunctionAccent(value, accent) {
  if (typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  if (lower === DARK_FUNCTION_SOURCE) return accent;
  if (lower.startsWith(DARK_FUNCTION_SOURCE) && lower.length === 9) {
    return accent + lower.slice(7);
  }
  return value;
}

function swapLightFunctionAccent(value, accent) {
  if (typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  if (LIGHT_FUNCTION_SOURCES.has(lower)) return accent;
  return value;
}

function brandTintedCommentColor(accent, variant, doc, bg) {
  // Comment colors stay deliberately dim against the editor background while
  // borrowing the brand's hue. We start at the canonical Lynx lightness and
  // nudge toward the editor background until the contrast ratio settles in
  // the 1.4 – 2.5 range that mirrors `#1e4a30` against the canonical dark.
  const targetMin = doc ? 1.6 : 1.35;
  const targetMax = doc ? 3.2 : 2.6;
  const sat = variant === 'dark' ? 0.30 : 0.18;
  const startL = variant === 'dark' ? (doc ? 0.24 : 0.18) : (doc ? 0.52 : 0.62);
  let l = startL;
  const step = variant === 'dark' ? 0.02 : -0.02;
  for (let i = 0; i < 18; i += 1) {
    const candidate = setSaturationLightness(accent, sat, Math.max(0, Math.min(1, l)));
    const ratio = bg ? contrastRatio(candidate, bg) : (targetMin + targetMax) / 2;
    if (ratio >= targetMin && ratio <= targetMax) return candidate;
    if (ratio > targetMax) {
      l -= step;
      break;
    }
    l += step;
  }
  return setSaturationLightness(accent, sat, Math.max(0, Math.min(1, l)));
}

function swapCommentColor(value, accent, variant, bg) {
  if (typeof value !== 'string') return value;
  const lower = value.toLowerCase();
  if (variant === 'dark' && DARK_COMMENT_SOURCES.has(lower)) {
    return brandTintedCommentColor(accent, 'dark', lower === '#285a3c', bg);
  }
  if (variant === 'light' && LIGHT_COMMENT_SOURCES.has(lower)) {
    return brandTintedCommentColor(accent, 'light', lower === '#7c828a', bg);
  }
  return value;
}

/**
 * Returns an accent variant guaranteed to clear `minRatio` against `bg`.
 *
 * For dark editor backgrounds we lighten the brand accent; for light backgrounds
 * we darken it. This keeps the brand hue intact while restoring legibility for
 * brands whose canonical color is too dim (Notion `#000000`, Slack `#4a154b`,
 * Heroku `#430098`) or too pale (Bun `#fbf0df`, Remix `#e8f2ff`) for their
 * paired surface.
 */
function ensureAccentContrast(accent, bg, minRatio) {
  if (!bg) return accent;
  const [h, s, l] = hexToHsl(accent);
  const bgLum = relativeLuminance(bg);
  // Direction: brighten when the background is dark, darken when it's light.
  const step = bgLum < 0.5 ? 0.04 : -0.04;
  let candidate = accent;
  let nextL = l;
  for (let i = 0; i < 24; i += 1) {
    if (contrastRatio(candidate, bg) >= minRatio) return candidate;
    nextL = Math.max(0, Math.min(1, nextL + step));
    candidate = hslToHex(h, Math.max(0.40, s), nextL);
    if (nextL <= 0 || nextL >= 1) break;
  }
  return candidate;
}

function applyAccentToSemanticTokens(semanticTokens, variant, accent) {
  const out = {};
  for (const [key, value] of Object.entries(semanticTokens)) {
    if (typeof value === 'string') {
      if (variant === 'dark') {
        out[key] = swapDarkFunctionAccent(value, accent);
      } else if (LIGHT_FUNCTION_SEMANTIC_KEYS.has(key)) {
        out[key] = accent;
      } else {
        out[key] = value;
      }
    } else if (value && typeof value === 'object') {
      const next = { ...value };
      if (typeof next.foreground === 'string') {
        if (variant === 'dark') {
          next.foreground = swapDarkFunctionAccent(next.foreground, accent);
        } else if (LIGHT_FUNCTION_SEMANTIC_KEYS.has(key)) {
          next.foreground = accent;
        }
      }
      out[key] = next;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function isCommentToken(token) {
  if (!token || typeof token !== 'object') return false;
  if (typeof token.name === 'string' && token.name.toLowerCase().startsWith('comment')) {
    return true;
  }
  const scope = token.scope;
  if (typeof scope === 'string') {
    return scope.startsWith('comment');
  }
  if (Array.isArray(scope)) {
    return scope.some((s) => typeof s === 'string' && s.startsWith('comment'));
  }
  return false;
}

function applyAccentToTokenColors(tokens, variant, accent, editorBg) {
  return tokens.map((token) => {
    if (!token || typeof token !== 'object' || !token.settings) return token;
    const settings = { ...token.settings };
    if (typeof settings.foreground === 'string') {
      let next = variant === 'dark'
        ? swapDarkFunctionAccent(settings.foreground, accent)
        : swapLightFunctionAccent(settings.foreground, accent);
      if (next === settings.foreground && isCommentToken(token)) {
        next = swapCommentColor(settings.foreground, accent, variant, editorBg);
      }
      settings.foreground = next;
    }
    return { ...token, settings };
  });
}

// =============================================================================
// Theme assembly
// =============================================================================

// Workbench keys whose surface stays on `darkBg` / `lightBg` but which we
// route to the editor surface override below. The base Lynx template uses
// the same hex for the editor and the workbench, so we have to override by
// property name to support brands like Discord where they differ.
const EDITOR_SURFACE_KEYS = [
  'editor.background',
  'editorGutter.background',
  'editorStickyScroll.background',
  'editorStickyScrollHover.background',
  'editorPane.background',
  'breadcrumbPicker.background',
];

function generateTheme(templateObj, cfg, variant) {
  const brandAccent = normalizeHex(cfg.accent);
  const editorBg = normalizeHex(
    variant === 'dark' ? cfg.darkEditorBg : cfg.lightEditorBg,
  );
  // The brand accent drives syntax-highlight function color, so it has to clear
  // a usable contrast against the editor background. We keep the original
  // brand hue but nudge lightness if the canonical color is too dim or pale
  // for the paired surface (e.g. Notion #000000 on dark, Bun #fbf0df on white).
  const syntaxAccent = ensureAccentContrast(brandAccent, editorBg, 3.5);

  const out = JSON.parse(JSON.stringify(templateObj));

  out.$schema = 'vscode://schemas/color-theme';
  out.semanticClass = `lynx-${cfg.slug}-${variant}-theme`;
  out.semanticHighlighting = true;
  out.name = `Lynx ${cfg.name} ${variant === 'dark' ? 'Dark' : 'Light'} Theme`;
  out.type = variant;

  const colorMap = variant === 'dark'
    ? buildDarkColorMap(cfg)
    : buildLightColorMap(cfg);

  if (out.colors) {
    out.colors = applyColorMapToColors(out.colors, colorMap);
    // Override editor surface keys with the brand's dedicated editor color.
    // The base template uses the same hex for editor and workbench, so we
    // surgically re-route the editor keys here to support brands like Discord
    // where the workbench surface and the editor surface differ.
    for (const key of EDITOR_SURFACE_KEYS) {
      if (key in out.colors) {
        out.colors[key] = editorBg;
      }
    }
  }
  if (out.semanticTokenColors) {
    out.semanticTokenColors = applyAccentToSemanticTokens(
      out.semanticTokenColors,
      variant,
      syntaxAccent,
    );
  }
  if (Array.isArray(out.tokenColors)) {
    out.tokenColors = applyAccentToTokenColors(
      out.tokenColors,
      variant,
      syntaxAccent,
      editorBg,
    );
  }

  return out;
}

// =============================================================================
// Main
// =============================================================================

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const themesDir = path.join(repoRoot, 'src', 'themes');
  const brandsDir = path.join(themesDir, 'brands');

  const darkTemplateRaw = fs.readFileSync(
    path.join(themesDir, '01_Lynx-Dark-theme.json'), 'utf8',
  );
  const lightTemplateRaw = fs.readFileSync(
    path.join(themesDir, '02_Lynx-Light-theme.json'), 'utf8',
  );
  const darkTemplate = parseJsonc(darkTemplateRaw);
  const lightTemplate = parseJsonc(lightTemplateRaw);

  fs.mkdirSync(brandsDir, { recursive: true });

  let generated = 0;
  for (const cfg of brands) {
    const slugDir = path.join(brandsDir, cfg.slug);
    fs.mkdirSync(slugDir, { recursive: true });

    const dark = generateTheme(darkTemplate, cfg, 'dark');
    const light = generateTheme(lightTemplate, cfg, 'light');

    fs.writeFileSync(
      path.join(slugDir, `${cfg.slug}-dark-theme.json`),
      JSON.stringify(dark, null, 2) + '\n',
    );
    fs.writeFileSync(
      path.join(slugDir, `${cfg.slug}-light-theme.json`),
      JSON.stringify(light, null, 2) + '\n',
    );

    generated += 2;
    console.log(`  ✓ ${cfg.name.padEnd(16)} → ${cfg.slug}/{dark,light}`);
  }

  console.log(`\nGenerated ${generated} theme files for ${brands.length} brands.`);
  console.log(`Output: ${path.relative(repoRoot, brandsDir)}/`);
}

if (require.main === module) {
  main();
}

module.exports = {
  buildDarkPalette,
  buildLightPalette,
  buildDarkColorMap,
  buildLightColorMap,
  generateTheme,
  parseJsonc,
  contrastRatio,
  relativeLuminance,
  hexToHsl,
  hslToHex,
  adjustLightness,
  mixHex,
};
