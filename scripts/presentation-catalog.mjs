import { DatabaseSync } from 'node:sqlite';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const reference = JSON.parse(readFileSync(new URL('../presentation/chilz-catalog.json', import.meta.url), 'utf8'));
const localImage = path => `data:image/jpeg;base64,${readFileSync(new URL('../artifacts/nebula/public' + path, import.meta.url)).toString('base64')}`;
/** Explicit additive upgrade; caller backs up and stops the presentation server first. */
export function installChilzCatalog(db, { credentials = 'generated' } = {}) {
  const existing = db.prepare("SELECT value FROM presentation_settings WHERE key='artist-catalog'").get();
  if (existing) return { changed: false, catalog: JSON.parse(existing.value) };
  db.exec('BEGIN IMMEDIATE');
  try {
    const state = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    if (state.accounts.some(a => a.email === 'chilz@nebula.local')) throw new Error('CHILZ email already exists without a catalog mapping. No existing account was changed.');
    const now = new Date().toISOString();
    state.nextId = Math.max(state.nextId, ...state.accounts.map(a => a.id + 1), ...state.projects.map(p => p.id + 1));
    const artistId = state.nextId++;
    const account = { id: artistId, name: 'CHILZ', email: 'chilz@nebula.local', role: 'artist', createdAt: now,
      artistOnboarding: { version: 1, step: 4, completedSteps: [1, 2, 3, 4], completedAt: now },
      artistPreferences: { collaboration: { opportunityTypes: [], creativeRoles: [], compensationKinds: [] }, discovery: { genres: [], genreIds: [], projectTypes: [], opportunityTypes: [] } } };
    if (credentials === 'generated') {
      account.salt = randomBytes(16).toString('hex');
      account.passwordDigest = pbkdf2Sync('Nebula2026!', account.salt, 600_000, 32, 'sha256').toString('hex');
    }
    state.accounts.push(account);
    state.artists.push({ id: artistId, name: 'CHILZ', username: 'chilz', picture: localImage(reference.picture.path),
      bio: 'Explore the releases, songs and collaborations of CHILZ.', creativeRoles: [], genreIds: [],
      collaborationAvailability: 'unspecified', publicInterests: [], externalLinks: [{ label: 'Spotify', url: reference.source }] });
    const catalog = { version: 1, artistId, artistName: 'CHILZ', source: reference.source, picture: reference.picture.path, releases: [] };
    const workIds = new Map();
    for (const release of reference.releases) {
      const projectId = state.nextId++;
      state.projects.push({ id: projectId, artistId, title: release.title, category: release.type,
        pitch: `${release.type} · ${release.year}`, story: `A release by CHILZ. Explore the tracklist below.`,
        coverUrl: localImage(release.artwork.path), presentationCatalogId: `spotify:${release.spotifyId}`, status: 'published', currency: 'USD', goalAmount: 0,
        useOfFunds: [], createdAt: now });
      const tracks = release.tracks.map((track, position) => {
        let workId = workIds.get(track.spotifyId);
        if (!workId) {
          workId = Number(db.prepare('INSERT INTO works(owner,title,description,created,updated) VALUES(?,?,?,?,?)').run(artistId, track.title, track.artists, now, now).lastInsertRowid);
          workIds.set(track.spotifyId, workId);
        }
        db.prepare('INSERT INTO project_works(project,work,position) VALUES(?,?,?)').run(projectId, workId, position);
        return { ...track, workId };
      });
      db.prepare('INSERT INTO project_tracklists(project,revision) VALUES(?,1)').run(projectId);
      catalog.releases.push({ spotifyId: release.spotifyId, projectId, title: release.title, type: release.type,
        year: release.year, source: release.source, coverUrl: release.artwork.path, tracks });
    }
    const scenario = JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='scenario'").get().value);
    const previous = state.accounts.find(a => a.id === scenario.principalId);
    if (previous && !scenario.actors.some(a => a.id === previous.id)) {
      const artist = state.artists.find(a => a.id === previous.id);
      scenario.personas = [...(scenario.personas ?? []), { id: previous.id, name: previous.name, role: previous.role, picture: artist?.picture }];
    }
    scenario.principalId = artistId;
    db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
    db.prepare("UPDATE presentation_settings SET value=? WHERE key='scenario'").run(JSON.stringify(scenario));
    db.prepare("INSERT INTO presentation_settings(key,value) VALUES('artist-catalog',?)").run(JSON.stringify(catalog));
    db.exec('COMMIT');
    return { changed: true, catalog };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const path = process.argv[2];
  if (!path) throw new Error('Pass an explicitly backed-up database path. Stop its server before upgrading.');
  const db = new DatabaseSync(resolve(path));
  try { const result = installChilzCatalog(db, { credentials: process.argv.includes('--redacted') ? 'redacted' : 'generated' }); console.log(JSON.stringify({ changed: result.changed, artistId: result.catalog.artistId, releases: result.catalog.releases.length })); }
  finally { db.close(); }
}
