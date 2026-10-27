// afterPack hook: ad-hoc signs the macOS .app inside-out so zip and dmg inherit a valid signature.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const MACHO_MAGIC = ['cffaedfe', 'feedfacf', 'cafebabe', 'bebafeca'];
const SKIP = [
  /\.app\/Contents\/MacOS\/[^/]+$/,
  /\.framework\/Versions\/[^/]+\/[^/]+$/,
];

function isMachO(file) {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(4);
    if (fs.readSync(fd, buf, 0, 4, 0) < 4) return false;
    return MACHO_MAGIC.includes(buf.toString('hex'));
  } finally {
    fs.closeSync(fd);
  }
}

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) walk(p, out);
    else if (entry.isFile()) out.push(p);
  }
}

function sign(p) {
  execFileSync('codesign', ['--force', '--sign', '-', p], { stdio: 'inherit' });
}

function directChildren(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(ext))
    .map((n) => path.join(dir, n));
}

exports.default = async (context) => {
  if (context.electronPlatformName !== 'darwin') return;

  const app = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  const frameworks = path.join(app, 'Contents', 'Frameworks');
  const resources = path.join(app, 'Contents', 'Resources');

  const files = [];
  walk(frameworks, files);
  walk(resources, files);
  const loose = files
    .filter((f) => !SKIP.some((re) => re.test(f)) && isMachO(f))
    .sort((a, b) => b.split(path.sep).length - a.split(path.sep).length);

  for (const f of loose) sign(f);
  for (const f of directChildren(frameworks, '.framework')) sign(f);
  for (const a of directChildren(frameworks, '.app')) sign(a);
  sign(app);

  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
  console.log(`adhoc-sign: ${app} signed and verified`);
};
