import { DatabaseSync } from 'node:sqlite';
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { access, copyFile, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

/** Install the audited fictional fixture once. Never import a presenter's active database. */
export async function preparePresentation(directory = resolve('.data/presentation')) {
  const root = resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(await readFile(join(root, 'presentation/seed/manifest.json'), 'utf8'));
  if (manifest.version !== 1) throw new Error('Unsupported presentation fixture version.');
  if (existsSync(directory)) {
    if (existsSync(join(directory, 'initial.sqlite')) && existsSync(join(directory, 'nebula.sqlite'))) {
      console.log('Presentation already prepared. Existing edits are preserved. Use demo:reset explicitly to restore.');
      return false;
    }
    throw new Error('An incomplete presentation directory exists. Back it up before preparing again.');
  }
  const sources = [...manifest.media, ...manifest.prepared, manifest.scene];
  const paths = new Map();
  for (const entry of sources) {
    const file = resolve(root, entry.path), rel = relative(root, file);
    if (rel.startsWith(`..${sep}`) || rel === '..' || !rel) throw new Error('Invalid fixture asset path.');
    if (!paths.has(file)) {
      await access(file);
      const hash = createHash('sha256').update(await readFile(file)).digest('hex');
      paths.set(file, hash);
    }
    if (paths.get(file) !== entry.sha256) throw new Error(`Fixture checksum mismatch: ${entry.path}`);
  }
  await mkdir(dirname(directory), { recursive: true });
  const temporary = await mkdtemp(join(dirname(directory), '.presentation-prepare-'));
  let db;
  try {
    await copyFile(resolve(root, manifest.scene.path), join(temporary, 'nebula.sqlite'));
    db = new DatabaseSync(join(temporary, 'nebula.sqlite'));
    const state = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    if (state.accounts.length !== manifest.accounts.length || state.accounts.some(a => !manifest.accounts.some(s => s.id === a.id && s.email === a.email) || !a.email.endsWith('@nebula.local'))) throw new Error('The fixture must contain only declared fictional accounts.');
    // No password hashes or session tokens are shipped in the fixture. Generate local demo credentials.
    for (const account of state.accounts) {
      account.salt = randomBytes(16).toString('hex');
      account.passwordDigest = pbkdf2Sync(manifest.defaultPassword, account.salt, 600_000, 32, 'sha256').toString('hex');
    }
    state.authEvents = [];
    db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
    for (const table of ['sessions', 'rate_limits', 'feed_snapshots']) db.exec(`DELETE FROM ${table}`);
    db.close(); db = undefined;
    await copyFile(join(temporary, 'nebula.sqlite'), join(temporary, 'initial.sqlite'));
    await mkdir(join(temporary, 'media')); await mkdir(join(temporary, 'prepared'));
    for (const entry of manifest.media) {
      if (!/^[a-zA-Z0-9-]+$/.test(entry.id)) throw new Error('Invalid media identifier.');
      await copyFile(resolve(root, entry.path), join(temporary, 'media', entry.id));
    }
    for (const entry of manifest.prepared) {
      if (!/^[a-zA-Z0-9._-]+$/.test(entry.name)) throw new Error('Invalid prepared filename.');
      await copyFile(resolve(root, entry.path), join(temporary, 'prepared', entry.name));
    }
    await writeFile(join(temporary, 'accounts.json'), JSON.stringify({ password: manifest.defaultPassword, accounts: manifest.accounts }, null, 2));
    await copyFile(join(root, 'presentation/closing-scene.json'), join(temporary, 'closing-scene.json'));
    await rename(temporary, directory);
    console.log(`Prepared ${manifest.accounts.length} fictional accounts, ${manifest.counts.posts} publications and ${manifest.media.length} media files. Open with pnpm start.`);
    return true;
  } finally {
    db?.close();
    await rm(temporary, { recursive: true, force: true });
  }
}
