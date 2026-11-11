import { DatabaseSync } from 'node:sqlite';
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from 'node:crypto';
import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const durationSeconds = 175.287438;
const paths = {
  original: 'presentation/assets/audio/luna-original.m4a',
  remix: 'presentation/assets/audio/luna-chilz-remix.m4a',
  originalCover: 'presentation/assets/covers/luna-original.png',
  remixCover: 'presentation/assets/covers/luna-chilz-remix.png',
};
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const setting = (db, key) => {
  const row = db.prepare('SELECT value FROM presentation_settings WHERE key=?').get(key);
  return row ? JSON.parse(row.value) : null;
};

function assetsFor(example) {
  return [
    [example.original.mediaId, paths.original, 'audio', 'audio/mp4'],
    [example.remix.mediaId, paths.remix, 'audio', 'audio/mp4'],
    [example.original.coverId, paths.originalCover, 'image', 'image/png'],
    [example.remix.coverId, paths.remixCover, 'image', 'image/png'],
  ].map(([id, path, kind, mime]) => {
    const bytes = readFileSync(resolve(root, path));
    return { id, path, kind, mime, size: bytes.length, sha256: digest(bytes) };
  });
}

/** Explicit, additive presentation-only import. Callers back up and stop their server first.
 * No active folder is inferred. Pass mediaDirectory to stage registered files alongside the DB;
 * otherwise media entries returned here can be appended to the portable fixture manifest.
 */
export function installLunaExample(db, { credentials = 'generated', mediaDirectory } = {}) {
  if (!['generated', 'redacted'].includes(credentials)) throw new Error('Choose generated or redacted credentials.');
  const existing = setting(db, 'luna-example');
  if (existing) return { changed: false, example: existing, media: assetsFor(existing) };
  const copied = [];
  db.exec('BEGIN IMMEDIATE');
  try {
    const catalog = setting(db, 'artist-catalog');
    const scenario = setting(db, 'scenario');
    const state = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    const chilz = catalog && state.accounts.find(a => a.id === catalog.artistId && a.role === 'artist' && a.email === 'chilz@nebula.local');
    if (!chilz || !state.artists.some(a => a.id === chilz.id) || !scenario) throw new Error('Install the mapped CHILZ presentation catalog first.');
    const named = [
      { name: 'gramz', email: 'gramz.demo@nebula.local', username: 'gramz-demo' },
      { name: 'SANNFERNNA', email: 'sannfernna.demo@nebula.local', username: 'sannfernna-demo' },
    ];
    if (state.accounts.some(a => named.some(n => n.email === a.email))) throw new Error('A LUNA demo email already exists without its mapping. No existing account was changed.');
    state.nextId = Math.max(state.nextId, ...state.accounts.map(a => a.id + 1), ...state.artists.map(a => a.id + 1), ...state.projects.map(p => p.id + 1));
    const now = new Date().toISOString();
    const originalImage = `data:image/png;base64,${readFileSync(resolve(root, paths.originalCover)).toString('base64')}`;
    const remixImage = `data:image/png;base64,${readFileSync(resolve(root, paths.remixCover)).toString('base64')}`;
    const accounts = named.map(({ username, ...identity }) => {
      const account = { ...identity, id: state.nextId++, role: 'artist', createdAt: now,
        artistOnboarding: { version: 1, step: 4, completedSteps: [1, 2, 3, 4], completedAt: now },
        artistPreferences: { collaboration: { opportunityTypes: [], creativeRoles: [], compensationKinds: [] }, discovery: { genres: [], genreIds: [], projectTypes: [], opportunityTypes: [] } } };
      if (credentials === 'generated') {
        account.salt = randomBytes(16).toString('hex');
        account.passwordDigest = pbkdf2Sync('Nebula2026!', account.salt, 600_000, 32, 'sha256').toString('hex');
      }
      state.accounts.push(account);
      state.artists.push({ id: account.id, name: account.name, username, picture: originalImage,
        bio: 'LUNA presentation artist. Original recording by gramz & SANNFERNNA.', creativeRoles: [], genreIds: [],
        collaborationAvailability: 'unspecified', publicInterests: [], externalLinks: [] });
      return { id: account.id, name: account.name, email: account.email, role: account.role };
    });
    const gramz = accounts[0], sannfernna = accounts[1];
    function addSong(owner, title, marker, image, artistIds, description) {
      const projectId = state.nextId++;
      state.projects.push({ id: projectId, artistId: owner, title, category: 'Single', pitch: 'Single · Presentation recording', story: description,
        coverUrl: image, presentationCatalogId: marker, status: 'published', currency: 'USD', goalAmount: 0, useOfFunds: [], createdAt: now });
      const workId = Number(db.prepare('INSERT INTO works(owner,title,description,created,updated) VALUES(?,?,?,?,?)').run(owner, title, description, now, now).lastInsertRowid);
      db.prepare('INSERT INTO project_works(project,work,position) VALUES(?,?,0)').run(projectId, workId);
      db.prepare('INSERT INTO project_tracklists(project,revision) VALUES(?,1)').run(projectId);
      return { projectId, workId, artistIds, title, mediaId: randomUUID(), coverId: randomUUID(), durationSeconds };
    }
    const original = addSong(gramz.id, 'luna', 'local:luna-original', originalImage, [gramz.id, sannfernna.id], 'Original recording by gramz & SANNFERNNA, supplied for this presentation.');
    const remix = addSong(chilz.id, 'luna - chilz remix', 'local:luna-chilz-remix', remixImage, [chilz.id], 'CHILZ remix of luna by gramz & SANNFERNNA. Finished recording supplied for this presentation.');
    const example = { version: 1, original, remix, accounts };
    const media = assetsFor(example);
    for (const entry of media) {
      const owner = [original.mediaId, original.coverId].includes(entry.id) ? gramz.id : chilz.id;
      db.prepare('INSERT INTO media(id,owner,kind,mime,size,created,name) VALUES(?,?,?,?,?,?,?)').run(entry.id, owner, entry.kind, entry.mime, entry.size, Date.now(), entry.path.split('/').at(-1));
      if (mediaDirectory) {
        mkdirSync(mediaDirectory, { recursive: true });
        const destination = join(mediaDirectory, entry.id);
        // Never replace an unrelated file, even in the unlikely event of an ID collision.
        copyFileSync(resolve(root, entry.path), destination, constants.COPYFILE_EXCL);
        copied.push(destination);
        if (digest(readFileSync(destination)) !== entry.sha256) throw new Error('LUNA media copy failed verification.');
      }
    }
    const post = (owner, song, description, attribution) => Number(db.prepare('INSERT INTO posts(owner,data,created,updated) VALUES(?,?,?,?)').run(owner, JSON.stringify({ workId: song.workId, title: song.title, description, mediaId: song.mediaId,
      coverId: song.coverId, projectId: song.projectId, allowRemix: !attribution, status: 'published', remix: attribution }), now, now).lastInsertRowid);
    original.postId = post(gramz.id, original, 'luna · gramz & SANNFERNNA. Original recording supplied for this presentation.', null);
    // This is a supplied finished recording, not a new Studio render. Keep truthful full-song
    // attribution; the existing 60-second limit for new renders is deliberately unchanged.
    remix.postId = post(chilz.id, remix, 'luna - chilz remix. Original by gramz & SANNFERNNA.', {
      sourceId: original.postId, sourceRevision: 1, startSeconds: 0, endSeconds: durationSeconds,
      baseGain: 1, voiceGain: 1, voiceOffset: 0, contributionKind: 'audio', artistId: gramz.id,
      artistName: gramz.name, title: original.title, projectId: original.projectId, grantedAt: now, sourceMediaId: original.mediaId,
    });
    scenario.personas = [...(scenario.personas ?? []), ...accounts.map(({ id, name, role }) => ({ id, name, role, picture: originalImage }))];
    db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
    db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scenario));
    db.prepare("INSERT INTO presentation_settings(key,value) VALUES('luna-example',?)").run(JSON.stringify(example));
    db.exec('COMMIT');
    return { changed: true, example, media };
  } catch (error) {
    db.exec('ROLLBACK');
    for (const path of copied) if (existsSync(path)) unlinkSync(path);
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = process.argv[2];
  if (!path) throw new Error('Pass an explicitly backed-up database path. Stop its server before upgrading.');
  const directoryAt = process.argv.indexOf('--media-directory');
  if (directoryAt >= 0 && !process.argv[directoryAt + 1]) throw new Error('--media-directory requires a destination.');
  const db = new DatabaseSync(resolve(path));
  try {
    const result = installLunaExample(db, { credentials: process.argv.includes('--redacted') ? 'redacted' : 'generated',
      mediaDirectory: directoryAt >= 0 ? resolve(process.argv[directoryAt + 1]) : undefined });
    console.log(JSON.stringify(result, null, 2));
  } finally { db.close(); }
}
