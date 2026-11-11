import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const key = 'chilz-funding-v1';
/** Additive presentation fixture only. Back up and stop the active server before installing.
 * Existing accounts, projects, recordings and contributions are never edited.
 */
export function installChilzFunding(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const previous = db.prepare('SELECT value FROM presentation_settings WHERE key=?').get(key);
    if (previous) { db.exec('COMMIT'); return { changed: false, ...JSON.parse(previous.value) }; }
    const catalog = JSON.parse(db.prepare("SELECT value FROM presentation_settings WHERE key='artist-catalog'").get().value);
    const state = JSON.parse(db.prepare('SELECT value FROM state WHERE id=1').get().value);
    const artist = state.artists.find(a => a.id === catalog.artistId);
    if (!artist || !state.accounts.some(a => a.id === artist.id && a.role === 'artist' && a.email === 'chilz@nebula.local')) throw new Error('The mapped CHILZ presentation identity is required.');
    const investors = ['Elena Costa', 'Noah Bennett'].map(name => state.accounts.find(a => a.role === 'investor' && a.name === name && a.email.endsWith('@nebula.local')));
    if (investors.some(a => !a)) throw new Error('Both existing presentation investors are required.');
    const now = new Date().toISOString();
    state.nextId = Math.max(state.nextId, ...[...state.accounts, ...state.projects, ...state.investments].map(record => record.id + 1));
    const project = { id: state.nextId++, artistId: artist.id, title: 'CHILZ · Next chapter', category: 'EP',
      pitch: 'New music, from the first session to the final release.', story: 'Recording, mixing and visual direction for the next chapter.',
      coverUrl: artist.picture ?? '', status: 'funding', currency: 'USD', goalAmount: 5000,
      useOfFunds: [{ label: 'Production', percentage: 60 }, { label: 'Mix & master', percentage: 25 }, { label: 'Visuals', percentage: 15 }], createdAt: now };
    state.projects.push(project);
    const contributions = investors.map((investor, index) => {
      const record = { id: state.nextId++, investorId: investor.id, projectId: project.id, projectTitle: project.title,
        artistId: artist.id, artistName: artist.name, amount: [750, 1250][index], currency: 'USD', status: 'preview', createdAt: now };
      state.investments.push(record);
      state.visibility.push({ projectId: project.id, investorId: investor.id, publicId: `${key}-${index + 1}`, showName: true, showAmount: true });
      return record.id;
    });
    const receipt = { version: 1, artistId: artist.id, projectId: project.id, contributionIds: contributions };
    db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(state));
    db.prepare('INSERT INTO presentation_settings(key,value) VALUES(?,?)').run(key, JSON.stringify(receipt));
    db.exec('COMMIT');
    return { changed: true, ...receipt };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error('Pass an explicitly backed-up presentation database. Stop its server first.');
  const db = new DatabaseSync(resolve(process.argv[2]));
  try { console.log(JSON.stringify(installChilzFunding(db))); } finally { db.close(); }
}
