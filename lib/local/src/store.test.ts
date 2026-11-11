import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalStore, PreviewDataError, STORAGE_KEY } from './store';
import { parseState } from './state';

function fixture() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  return { store: createLocalStore(storage), storage };
}
const credentials = { name: 'Artist One', email: 'artist@example.invalid', password: 'preview123' };
const projectInput = { title: 'First Release', category: 'Album', goalAmount: 10_000, status: 'funding' as const };

describe('browser-only preview flows', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('starts completely empty and performs no network requests', async () => {
    const network = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network unavailable'));
    const { store } = fixture();
    expect(store.getCurrentUser()).toBeNull();
    expect(store.listArtists()).toEqual([]);
    expect(store.listProjects()).toEqual([]);
    await store.register({ ...credentials, role: 'artist' });
    store.createProject(projectInput);
    expect(network).not.toHaveBeenCalled();
  });

  it('keeps the artist profile, edits and project lifecycle in tab storage', async () => {
    const { store, storage } = fixture();
    const artist = await store.register({ ...credentials, role: 'artist' });
    expect(storage.getItem(STORAGE_KEY)).not.toContain(credentials.password);
    store.updateArtist({ name: 'Artist Updated', genre: 'Electronic', bio: 'A local preview.' });
    expect(store.getCurrentUser()?.name).toBe('Artist Updated');
    const draft = store.createProject({ ...projectInput, status: 'draft' });
    expect(store.getArtist(artist.artistId!)?.projects).toHaveLength(1);
    store.logout();
    expect(store.listProjects()).toEqual([]);
    expect(store.getProject(draft.id)).toBeNull();
    await expect(store.login({ ...credentials, password: 'incorrect' })).rejects.toThrow();
    await store.login(credentials);
    store.updateProject(draft.id, { status: 'funding', title: 'Published Release' });
    expect(store.listProjects({ search: 'published' })).toHaveLength(1);
    expect(createLocalStore(storage).getCurrentUser()?.artistId).toBe(artist.artistId);
    store.deleteProject(draft.id);
    expect(store.listProjects()).toEqual([]);
  });

  it('retains role boundaries and prevents another artist from editing projects', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    const project = store.createProject(projectInput);
    await store.register({ ...credentials, email: 'second@example.invalid', role: 'artist' });
    expect(() => store.updateProject(project.id, { title: 'Changed' })).toThrow('does not belong');
    expect(() => store.deleteProject(project.id)).toThrow('does not belong');
    expect(() => store.createInvestment({ projectId: project.id, amount: 500 })).toThrow();
    await store.register({ ...credentials, email: 'investor@example.invalid', role: 'investor' });
    expect(() => store.createProject(projectInput)).toThrow();
    expect(() => store.toggleProjectSupport(project.id)).toThrow();
  });

  it('previews pledges and receipts without making a payment', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    const project = store.createProject(projectInput);
    await store.register({ ...credentials, email: 'investor@example.invalid', name: 'Investor One', role: 'investor' });
    expect(() => store.createInvestment({ projectId: project.id, amount: -1 })).toThrow();
    expect(() => store.createInvestment({ projectId: project.id, amount: NaN })).toThrow();
    const pledge = store.createInvestment({ projectId: project.id, amount: 500 });
    expect(pledge.status).toBe('preview');
    expect(store.getProject(project.id)?.project).toMatchObject({ raisedAmount: 500, backersCount: 1 });
    expect(store.listMyInvestments()).toHaveLength(1);
    expect(store.getInvestment(pledge.id)?.amount).toBe(500);
    store.logout();
    expect(store.getInvestment(pledge.id)).toBeNull();
  });

  it('supports and unsupports other artists, while keeping drafts private', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    const project = store.createProject(projectInput);
    expect(() => store.toggleProjectSupport(project.id)).toThrow('another artist');
    await store.register({ ...credentials, email: 'second@example.invalid', role: 'artist' });
    expect(store.toggleProjectSupport(project.id)).toEqual({ supported: true, supportsCount: 1 });
    expect(store.getProject(project.id)?.viewerHasSupported).toBe(true);
    expect(store.toggleProjectSupport(project.id)).toEqual({ supported: false, supportsCount: 0 });
  });

  it('rejects remote media and invalid project data', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    expect(() => store.createProject({ ...projectInput, coverUrl: '//example.invalid/image.png' })).toThrow('from your device');
    expect(() => store.updateArtist({ name: 'Artist One', picture: '//example.invalid/avatar.png' })).toThrow();
    expect(() => store.createProject({ ...projectInput, goalAmount: -50 })).toThrow();
    expect(() => store.createProject({ ...projectInput, useOfFunds: [{ label: 'Production', percentage: 50 }] })).toThrow('100%');
    expect(store.listProjects()).toEqual([]);
  });

  it('keeps zero-goal catalogs editable and archivable without relaxing ordinary funding', async () => {
    const { store, storage } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    const funding = store.createProject(projectInput);
    const original = parseState(storage.getItem(STORAGE_KEY)!);
    const catalog = { ...original.projects[0], id: original.nextId, goalAmount: 0, status: 'published' as const };
    const rawWithCatalog = (overrides: Record<string, unknown>) => JSON.stringify({
      ...original, nextId: original.nextId + 1,
      projects: [...original.projects, { ...catalog, ...overrides }],
    });
    expect(parseState(rawWithCatalog({})).projects[1]).toMatchObject({ goalAmount: 0, status: 'published' });
    expect(() => parseState(rawWithCatalog({ presentationCatalogId: 'unverified-catalog' }))).toThrow(PreviewDataError);
    for (const presentationCatalogId of ['spotify:0123456789ABCDEFGHIJKL', 'local:luna-original', 'local:luna-chilz-remix']) {
      const restored = parseState(rawWithCatalog({ presentationCatalogId }));
      expect(restored.projects[0]).toEqual(original.projects[0]);
      expect(restored.projects[1]).toMatchObject({ presentationCatalogId, goalAmount: 0, status: 'published' });
      for (const status of ['draft', 'funding', 'funded', 'closed']) {
        expect(() => parseState(rawWithCatalog({ presentationCatalogId, status }))).toThrow(PreviewDataError);
      }
    }
    expect(() => store.createProject({ ...projectInput, goalAmount: 0, status: 'funding' })).toThrow('Set a funding goal');
    storage.setItem(STORAGE_KEY, rawWithCatalog({ presentationCatalogId: 'spotify:0123456789ABCDEFGHIJKL' }));
    await store.register({ ...credentials, email: 'investor@example.invalid', role: 'investor' });
    expect(() => store.createInvestment({ projectId: catalog.id, amount: 100 })).toThrow('not open for contributions');
    expect(store.createInvestment({ projectId: funding.id, amount: 100 })).toMatchObject({ projectId: funding.id, amount: 100, currency: 'USD' });
    expect(store.getProject(funding.id)?.project).toMatchObject({ goalAmount: 10_000, status: 'funding', raisedAmount: 100 });
    await store.login(credentials);
    expect(store.updateProject(catalog.id, { title: 'Updated catalog title', story: 'Presentation edit' }))
      .toMatchObject({ title: 'Updated catalog title', story: 'Presentation edit', goalAmount: 0, presentationCatalogId: 'spotify:0123456789ABCDEFGHIJKL' });
    expect(() => store.updateProject(catalog.id, { status: 'funding', goalAmount: 500 })).toThrow('without funding');
    const forged = { ...projectInput, presentationCatalogId: 'spotify:0123456789ABCDEFGHIJKL' };
    expect(store.createProject({ ...forged, status: 'published', goalAmount: 0 })).not.toHaveProperty('presentationCatalogId');
    expect(store.createProject(forged)).not.toHaveProperty('presentationCatalogId');
    expect(store.updateProject(funding.id, { ...forged, title: 'Ordinary funding' })).not.toHaveProperty('presentationCatalogId');
    store.deleteProject(catalog.id);
    const archived = parseState(storage.getItem(STORAGE_KEY)!);
    expect(archived.projects.find(p => p.id === catalog.id)).toMatchObject({ goalAmount: 0, status: 'closed', archivedAt: expect.any(String) });
    const reloaded = createLocalStore(storage);
    expect(reloaded.getProject(catalog.id)).toBeNull();
    expect(reloaded.getProject(funding.id)?.project).toMatchObject({ goalAmount: 10_000, status: 'funding', raisedAmount: 100 });
  });

  it('persists optional funding, validates allocation and protects received contributions', async () => {
    const { store, storage } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    const release = store.createProject({ ...projectInput, goalAmount: 0, useOfFunds: [], status: 'published' });
    expect(createLocalStore(storage).getProject(release.id)?.project.goalAmount).toBe(0);
    expect(() => store.updateProject(release.id, { status: 'funding' })).toThrow('Set a funding goal');
    expect(() => store.updateProject(release.id, { status: 'funded' })).toThrow('Set a funding goal');
    expect(() => store.updateProject(release.id, { goalAmount: 5000, useOfFunds: [{ label: 'Recording', percentage: 60 }] })).toThrow('100%');
    const allocation = [{ label: 'Recording', percentage: 60 }, { label: 'Mix', percentage: 40 }];
    store.updateProject(release.id, { status: 'funding', goalAmount: 5000, useOfFunds: allocation });
    await store.register({ ...credentials, email: 'backer@example.invalid', role: 'investor' });
    store.createInvestment({ projectId: release.id, amount: 250 });
    await store.login(credentials);
    expect(() => store.updateProject(release.id, { status: 'published', goalAmount: 0, useOfFunds: [] })).toThrow('has contributions');
    const saved = store.updateProject(release.id, { status: 'closed' });
    expect(saved).toMatchObject({ raisedAmount: 250, goalAmount: 5000, useOfFunds: allocation });
    expect(store.listReceivedInvestments()).toHaveLength(1);
    const unfunded = store.createProject({ ...projectInput, status: 'draft', goalAmount: 0, useOfFunds: [] });
    store.updateProject(unfunded.id, { status: 'closed' });
    expect(createLocalStore(storage).getProject(unfunded.id)?.project.goalAmount).toBe(0);
  });

  it('clears every profile and record when resetting the preview', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    store.createProject(projectInput);
    store.reset();
    expect(store.getCurrentUser()).toBeNull();
    expect(store.listArtists()).toEqual([]);
    expect(store.listProjects()).toEqual([]);
  });

  it('retains archived project receipts, totals and ownership while blocking new contributions', async () => {
    const { store, storage } = fixture();
    const artist = await store.register({ ...credentials, role: 'artist' });
    const project = store.createProject(projectInput);
    await store.register({ ...credentials, email: 'investor@example.invalid', role: 'investor' });
    const pledge = store.createInvestment({ projectId: project.id, amount: 200.75 });
    await store.login(credentials);
    store.deleteProject(project.id);
    expect(store.listProjects()).toEqual([]);
    expect(store.getProject(project.id)).toBeNull();
    expect(store.getArtist(artist.artistId!)?.totalRaised).toBe(200.75);
    expect(store.listArtists()[0]).toMatchObject({ totalRaised: 200.75, projectCount: 0 });
    expect(() => store.updateProject(project.id, { status: 'funding' })).toThrow();
    expect(() => store.toggleProjectSupport(project.id)).toThrow('not open');
    expect(store.getInvestment(pledge.id)).toBeNull();
    await store.login({ ...credentials, email: 'investor@example.invalid' });
    expect(() => store.createInvestment({ projectId: project.id, amount: 100 })).toThrow('not open');
    expect(store.getInvestment(pledge.id)).toMatchObject({ amount: 200.75, currency: 'USD', projectArchived: true });
    expect(createLocalStore(storage).listMyInvestments()).toHaveLength(1);
    store.logout();
    expect(store.getInvestment(pledge.id)).toBeNull();
  });

  it('enforces USD and exact cents for creation, updates and aggregates', async () => {
    const { store } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    expect(() => store.createProject({ ...projectInput, currency: 'EUR' as never })).toThrow('Only USD');
    expect(() => store.createProject({ ...projectInput, goalAmount: 100.001 })).toThrow('decimal');
    const project = store.createProject({ ...projectInput, goalAmount: 1000.25 });
    expect(project.currency).toBe('USD');
    expect(store.updateProject(project.id, { title: 'Updated' }).currency).toBe('USD');
    expect(() => store.updateProject(project.id, { currency: 'EUR' } as never)).toThrow('Only USD');
    await store.register({ ...credentials, email: 'investor@example.invalid', role: 'investor' });
    expect(() => store.createInvestment({ projectId: project.id, amount: 100.001 })).toThrow('decimal');
    store.createInvestment({ projectId: project.id, amount: 100.10 });
    store.createInvestment({ projectId: project.id, amount: 100.20 });
    expect(store.getProject(project.id)?.project.raisedAmount).toBe(200.30);
  });

  it.each(['{broken', '', 'null', '{"version":99}', '{"version":3,"accounts":[null]}'])(
    'allows backup and explicit reset of unreadable data: %s', raw => {
      const { store, storage } = fixture();
      storage.setItem(STORAGE_KEY, raw);
      expect(() => store.getCurrentUser()).toThrow(PreviewDataError);
      expect(store.exportData()).toBe(raw);
      store.reset();
      expect(store.getCurrentUser()).toBeNull();
      expect(store.listProjects()).toEqual([]);
    },
  );

  it('detects invalid records and broken references inside valid JSON', async () => {
    const { store, storage } = fixture();
    await store.register({ ...credentials, role: 'artist' });
    store.createProject(projectInput);
    const raw = storage.getItem(STORAGE_KEY)!;
    const invalidRecord = JSON.parse(raw);
    invalidRecord.projects[0].title = 42;
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidRecord));
    expect(() => store.getCurrentUser()).toThrow(PreviewDataError);
    const invalidReference = JSON.parse(raw);
    invalidReference.projects[0].artistId = 999;
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidReference));
    expect(() => store.getCurrentUser()).toThrow(PreviewDataError);
    const invalidStatus = JSON.parse(raw);
    invalidStatus.projects[0].status = ['funding'];
    storage.setItem(STORAGE_KEY, JSON.stringify(invalidStatus));
    expect(() => store.getCurrentUser()).toThrow(PreviewDataError);
  });

  it('reports unavailable reads and failed resets without pretending data was cleared', () => {
    const denied = createLocalStore({ getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } });
    expect(() => denied.getSnapshot()).toThrow(PreviewDataError);
    expect(() => denied.reset()).toThrow('unavailable');
    const raw = '{broken';
    const full = createLocalStore({ getItem: () => raw, setItem: () => { throw new Error('quota'); } });
    expect(() => full.reset()).toThrow('full or unavailable');
    expect(full.exportData()).toBe(raw);
  });
});
