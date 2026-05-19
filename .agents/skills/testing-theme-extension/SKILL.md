---
name: testing-theme-extension
description: Run the VS Code Extension Development Host on a headless Devin VM and visually verify color-theme changes. Use when testing PRs that touch files under `src/themes/`, brand theme generators, or the workbench/editor surface colour mapping.
---

# Testing VS Code color themes on a headless Devin VM

This SKILL covers what's needed to run the Extension Development Host of
`VSSk1n-Theme-Pro` (or any sibling VS Code theme extension) on a Devin VM
that has no window manager out of the box, switch themes programmatically,
and collect screenshot evidence per (brand × variant). Tested end-to-end
while validating the 100-theme Brand Themes Pack (PR #2).

## 1. Devin VM display layout (don't get this wrong)

Devin VMs already run an X server, but it's TigerVNC, not Xorg, and **no
window manager is started by default**. Confirm with:

```bash
ps -fp $(pgrep -f Xtigervnc | head -1)   # /usr/bin/Xtigervnc :0 -localhost=1 -rfbport 5901 …
DISPLAY=:0 wmctrl -m                      # should report `Name: Fluxbox` *after* you start one
```

If `wmctrl -m` says `Cannot get window manager info properties` you have no
WM. VS Code launches but exits silently (you'll see
`Error: EBADF: bad file descriptor, read` in the launch log) until a WM is
running. Fluxbox is the lightest reliable option:

```bash
sudo apt-get install -y fluxbox
DISPLAY=:0 nohup setsid fluxbox </dev/null >/tmp/fluxbox.log 2>&1 &
sleep 2 && DISPLAY=:0 wmctrl -m | head -3   # expect `Name: Fluxbox`
```

`setsid … </dev/null` is what stops the EBADF — Node-based GUI processes
backgrounded with plain `&` inherit the shell's pipe stdin and crash when
the shell exits.

## 2. Launch the Extension Development Host

The extension needs to be compiled first; the manifest references
`./dist/themes/liquid-theme/liquid-theme.js`:

```bash
(cd /home/ubuntu/repos/VSSk1n-Theme-Pro && npm install && npm run compile)
```

Then launch VS Code:

```bash
DISPLAY=:0 nohup setsid code --no-sandbox \
  --user-data-dir=/home/ubuntu/.vscode-test-userdata \
  --extensions-dir=/home/ubuntu/.vscode-test-extdir \
  --extensionDevelopmentPath=/home/ubuntu/repos/VSSk1n-Theme-Pro \
  --disable-workspace-trust \
  /home/ubuntu/brand-theme-test \
  </dev/null >/tmp/vscode.log 2>&1 &

sleep 18 && DISPLAY=:0 wmctrl -l   # confirm `[Extension Development Host] … - Visual Studio Code`
```

The `--user-data-dir` is important: it isolates this session from any other
VS Code state on the VM and is the canonical place to write
`User/settings.json` (used in §3).

Maximize the window (`wmctrl -r 'Extension Development Host' -b add,maximized_vert,maximized_horz`)
before screenshotting.

## 3. Switch themes by rewriting `User/settings.json`

**Do not** drive the `Ctrl+K Ctrl+T` picker with xdotool. The brand label
format — e.g. `GitHub Darkㅤ(Lynx Brand)` — embeds a U+3164 HANGUL FILLER
that doesn't survive xdotool's `type` for many keyboard layouts.

Instead, write the label directly into `User/settings.json`. VS Code
hot-reloads `workbench.colorTheme` from settings within ~1.5 s without
needing a window reload:

```bash
cat > /home/ubuntu/.vscode-test-userdata/User/settings.json <<EOF
{
  "workbench.colorTheme": "GitHub Darkㅤ(Lynx Brand)",
  "workbench.startupEditor": "none",
  "workbench.welcomePage.walkthroughs.openOnInstall": false,
  "workbench.editor.empty.hint": "hidden",
  "editor.minimap.enabled": true,
  "editor.fontSize": 14,
  "telemetry.telemetryLevel": "off",
  "update.mode": "none",
  "extensions.autoCheckUpdates": false
}
EOF
sleep 2.2
```

Get the exact label list from `package.json`:

```bash
python3 -c "import json; d=json.load(open('package.json')); [print(repr(t['label'])) for t in d['contributes']['themes']]"
```

The brand labels are alphabetized and live below the 8 core Lynx labels.

## 4. Screenshot + pixel-sample

ImageMagick's `import` is the reliable way to grab the root window:

```bash
DISPLAY=:0 import -window root /tmp/test-evidence/01-github-dark.png
```

For pixel-level assertions sample with Pillow at known coordinates inside
the 1600×1122 window:

```python
from PIL import Image
im = Image.open('/tmp/test-evidence/01-github-dark.png').convert('RGB')
print(im.getpixel((900, 500)))   # editor body — should be the brand's editor bg
print(im.getpixel((170, 400)))   # sidebar — should be the brand's workbench bg
print(im.getpixel((24, 100)))    # activity bar — same as sidebar in 49/50 brands
```

Use a ±14 RGB-per-channel tolerance when comparing to the brand config —
the X server / VNC pipeline can shift values by a handful of units even on a
pure background.

## 5. Caveat: light variants don't use the raw `lightBg` for sidebar

The Lynx Light base template (`02_Lynx-Light-theme.json`) intentionally
derives a slightly darker shade (~ 15 RGB units) for
`sideBar.background` and `activityBar.background` than the editor surface,
to give light themes visual depth. The brand generator preserves this
convention. So a sample like:

| Brand | `lightBg` (config) | `sideBar.background` (generated JSON) | Sampled pixel |
| ----- | ------------------ | ------------------------------------- | ------------- |
| GitHub Light | `#f6f8fa` | `#e9eef3` | `#e9eef3` ✓ |
| Stripe Light | `#f6f9fc` | `#e7eff7` | `#e7eff7` ✓ |
| React Light  | `#f0faff` | `#dcf3ff` | `#dcf3ff` ✓ |
| Tailwind Light | `#f0fafe` | `#ddf4fd` | `#ddf4fd` ✓ |
| Discord Light | `#f0f0ff` | `#dcdcff` | `#dcdcff` ✓ |

**Always compare the sampled pixel to the generated JSON, not the brand
config.** Grep is enough since the files are JSONC (Python's `json.loads`
will choke):

```bash
grep -E '"editor\.background"|"sideBar\.background"|"activityBar\.background"' \
  src/themes/brands/$slug/$slug-$variant-theme.json
```

## 6. Cross-cutting assertions

These run once and cover the entire 100-theme pack, not just the spot-
checked brands:

```bash
node scripts/qa-contrast.js   # last line must be: "All 100 themes passed contrast thresholds."
find ~/.vscode-test-userdata/logs -name exthost.log -mmin -10 \
  -exec grep -iE '\[error\]' {} +   # must return nothing
git diff origin/main -- src/themes/0*_Lynx-*.json   # base 8 themes must be unchanged
grep -E '^scripts' .vscodeignore     # dev-only scripts must be excluded from VSIX
```

## 7. Brands worth picking when smoke-testing

- **GitHub** — closest to the Lynx baseline, the regression canary.
- **Stripe** — vibrant `#635bff` on navy `#0a2540`; exercises `ensureAccentContrast`.
- **React** — brand cyan `#61dafb` is visually close to the universal info `#4dc9ff`; verifies no scope collapse.
- **Tailwind CSS** — saturated cyan, very different hue from the base `#00d882`; catches leftover lime-green tokens.
- **Discord** — the *only* brand whose workbench (`#2c2f33`) differs from editor (`#1e2124`); exercises the `EDITOR_SURFACE_KEYS` routing in the generator.

If any one of those 5 looks wrong, the pack is broken. Light variants of
the same 5 brands cover the light-template path.

## 8. Common failure modes & fixes

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `code` exits immediately, log says `EBADF: bad file descriptor, read` | Backgrounded with `&` but stdin is the shell's pipe; or no WM running | Use `setsid … </dev/null`; install + start `fluxbox` first |
| `wmctrl: Cannot get window manager info properties` | No WM on `:0` | `sudo apt-get install -y fluxbox && DISPLAY=:0 setsid fluxbox …` |
| Screenshot shows VS Code welcome / Copilot sign-in modal | First launch in this user-data dir | Either click "Continue without Signing In" via xdotool, or set `"workbench.startupEditor": "none"` + `"workbench.welcomePage.walkthroughs.openOnInstall": false` in settings.json (and accept that the modal will appear once) |
| Pixel sample at (900,500) returns a token color, not the bg | Sample point landed on a syntax token | Pick a different (x,y) inside the editor body, e.g. (1200, 1000) — the bottom-right gutter area is usually clean |
| `json.loads` rejects a generated theme | Files are JSONC (comments + trailing commas) | Either `grep` the keys you need, or strip JSONC first (`re.sub(r'/\*.*?\*/','',…,flags=re.S)` + `re.sub(r'//.*','',…)` + `re.sub(r',(\s*[}\]])',r'\1',…)`) |

## 9. Devin secrets needed

None. The Extension Development Host runs entirely offline from the local
repo. No GitHub/Copilot/VS Code Marketplace login is required.
