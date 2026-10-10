// Renders index.html to an MP4: Playwright seeks every frame, FFmpeg encodes it with the soundtrack.
//
//   python3 audio.py && node render.mjs [out.mp4] [fps]
//   node render.mjs --html v2/index.html --audio v2/out/soundtrack.wav --out v2/out/x.mp4 --fps 60 --sub 3
//   --sub N renders N sub-frames per frame and blends them: real motion blur.
import { createRequire } from 'module';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), flag = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const HTML = path.resolve(HERE, flag('html', 'index.html'));
const SRC_AUDIO = path.resolve(HERE, flag('audio', path.join('out', 'soundtrack.wav')));
const OUT = path.resolve(HERE, flag('out', pos[0] || path.join('out', 'trivvo-film.mp4')));
const FPS = Number(flag('fps', pos[1] || 30));
const SUB = Number(flag('sub', 1));
// Fraction of each frame the shutter stays open; 0.5 is the film-standard 180-degree shutter.
const SHUTTER = Number(flag('shutter', 1));
const DUR = 60;

// Encode from a private copy of the soundtrack so regenerating it mid-render can't break the mux.
const AUDIO = path.join(path.dirname(OUT), `.render-audio-${process.pid}.wav`);
fs.copyFileSync(SRC_AUDIO, AUDIO);

const browser = await pw.chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.log('pageerror:', e.message));
await page.goto('file://' + HTML);
const fontOk = await page.evaluate(() => window.ready);
if (!fontOk) throw new Error('brand font did not load');

const ff = spawn('ffmpeg', [
  '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-i', '-',
  '-i', AUDIO,
  ...(SUB > 1 ? ['-vf', `tmix=frames=${SUB},select='eq(mod(n\\,${SUB})\\,${SUB - 1})',setpts=N/(${FPS}*TB)`] : []),
  '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-tune', 'animation',
  '-pix_fmt', 'yuv420p', '-r', String(FPS), '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', OUT,
], { stdio: ['pipe', 'inherit', 'inherit'] });
let ffDone = false;
ff.on('close', (code) => { ffDone = true; if (code) { console.error('ffmpeg exited with', code); process.exit(1); } });

const frames = Math.round(DUR * FPS * SUB), t0 = Date.now();
for (let f = 0; f < frames; f++) {
  const i = Math.floor(f / SUB), k = f % SUB;
  await page.evaluate((t) => window.seek(t), (i + (k * SHUTTER) / SUB) / FPS);
  const png = await page.screenshot({ type: 'png' });
  if (ffDone) throw new Error('ffmpeg stopped early');
  if (!ff.stdin.write(png)) await new Promise((r) => ff.stdin.once('drain', r));
  if (f % (300 * SUB) === 0) console.log(`frame ${f}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
ff.stdin.end();
await new Promise((r) => (ffDone ? r() : ff.on('close', r)));
fs.unlinkSync(AUDIO);
await browser.close();
console.log('wrote', OUT);
