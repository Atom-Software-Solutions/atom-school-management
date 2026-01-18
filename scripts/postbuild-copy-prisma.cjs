// Copy generated Prisma client into dist so compiled JS can resolve @generated/prisma
// This script is cross-platform (Node only).

const fs = require('fs');
const path = require('path');

const projectRoot = __dirname ? path.join(__dirname, '..') : process.cwd();
const srcDir = path.join(projectRoot, 'generated', 'prisma');
const destDir = path.join(projectRoot, 'dist', 'generated', 'prisma');

if (!fs.existsSync(srcDir)) {
  console.warn('[postbuild] Skipping Prisma copy: source directory not found:', srcDir);
  process.exit(0);
}

fs.rmSync(destDir, { recursive: true, force: true });
fs.mkdirSync(destDir, { recursive: true });

/** @param {string} from @param {string} to */
function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
  } else {
    fs.copyFileSync(from, to);
  }
}

copyRecursive(srcDir, destDir);

console.log('[postbuild] Copied Prisma client from', srcDir, 'to', destDir);
