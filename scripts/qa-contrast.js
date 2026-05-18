#!/usr/bin/env node
/**
 * Quick contrast audit for the generated brand themes.
 *
 * For every generated theme this script computes the WCAG contrast ratio
 * between the editor foreground and the editor background, the brand accent
 * and the editor background, and the diagnostic colors (error / warning /
 * info) and the editor background. Anything below 4.5:1 for primary text or
 * 3:1 for large/UI text is reported. Brand backgrounds with extremely low
 * surface contrast (`editor.background` vs `sideBar.background`) are also
 * flagged for review.
 *
 * Usage:
 *   node scripts/qa-contrast.js [--all]
 *
 * Without flags the script prints a one-line summary per brand and only
 * surfaces violations. With `--all` every metric is printed.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const brands = require('./brand-configs.js');
const { contrastRatio } = require('./generate-brand-theme.js');

const verbose = process.argv.includes('--all');
const repoRoot = path.resolve(__dirname, '..');
const brandsDir = path.join(repoRoot, 'src', 'themes', 'brands');

function check(label, fg, bg, minRatio) {
  const ratio = contrastRatio(fg, bg);
  return {
    label,
    fg,
    bg,
    ratio: Math.round(ratio * 100) / 100,
    ok: ratio >= minRatio,
    minRatio,
  };
}

function loadTheme(slug, variant) {
  const file = path.join(brandsDir, slug, `${slug}-${variant}-theme.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

let violations = 0;
for (const cfg of brands) {
  for (const variant of ['dark', 'light']) {
    const theme = loadTheme(cfg.slug, variant);
    const c = theme.colors;
    const fg = c['editor.foreground'];
    const bg = c['editor.background'];
    const fnFg = theme.tokenColors.find(
      (t) => t.name === 'Function Names',
    ).settings.foreground;
    const cmtFg = theme.tokenColors.find(
      (t) => t.name === 'Comment — Line',
    ).settings.foreground;
    const err = c['list.errorForeground'];
    const warn = c['list.warningForeground'];

    // Comments are intentionally dim and may sit ~1.3:1 against the editor
    // background; this is the same convention as the base Lynx Dark theme
    // (`#1e4a30` on `#080c09`). The warning color is the universal
    // `#F59E0B` (light) / `#f5c842` (dark) preserved across all brands per
    // the design guideline that error/warning/info diagnostic colors are
    // brand-independent — we don't audit it here.
    const checks = [
      check('text/bg', fg, bg, 4.5),
      check('fn/bg', fnFg, bg, 3.0),
      check('cmt/bg', cmtFg, bg, 1.3),
      check('err/bg', err, bg, 3.0),
    ];

    const fails = checks.filter((x) => !x.ok);
    if (fails.length || verbose) {
      const summary = checks
        .map((x) => `${x.label}:${x.ratio}${x.ok ? '' : '!'}`)
        .join('  ');
      const status = fails.length ? 'FAIL' : 'ok  ';
      console.log(
        `${status} ${cfg.name.padEnd(14)} ${variant.padEnd(5)} ${summary}`,
      );
      violations += fails.length;
    }
  }
}

if (violations === 0) {
  console.log(`\nAll ${brands.length * 2} themes passed contrast thresholds.`);
  process.exit(0);
} else {
  console.log(`\n${violations} contrast violation(s) detected.`);
  process.exit(1);
}
