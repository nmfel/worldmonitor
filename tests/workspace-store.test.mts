import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { WorkspaceStore } from '../src/services/workspace-store.ts';

class MockStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] ?? null;
  }
}

const WORKSPACE_LIST_KEY = 'wm-workspaces-v1:full';
const WORKSPACE_ACTIVE_KEY = 'wm-active-workspace:full';

describe('WorkspaceStore', () => {
  let mockStorage: MockStorage;

  beforeEach(() => {
    mockStorage = new MockStorage();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  function newStore(variant = 'full'): WorkspaceStore {
    return new WorkspaceStore(variant, mockStorage);
  }

  it('initializes empty state when storage is empty', () => {
    const store = newStore();
    const state = store.loadState();
    assert.equal(state, null);
  });

  it('createWorkspace adds workspace and sets it active', () => {
    const store = newStore();
    const ws = store.createWorkspace('Test Workspace');
    assert.ok(ws.id.startsWith('workspace-'));
    assert.equal(ws.name, 'Test Workspace');
    assert.equal(ws.variant, 'full');
    assert.deepEqual(ws.placements, []);
    assert.equal(ws.created, ws.updated);

    const state = store.loadState();
    assert.ok(state);
    assert.equal(state!.activeWorkspaceId, ws.id);
    assert.equal(state!.workspaces.length, 1);
    assert.deepEqual(state!.workspaces[0], ws);
  });

  it('createWorkspace with placements copies and validates them', () => {
    const store = newStore();
    const placements = [
      { instanceId: 'i1', moduleId: 'markets', enabled: true, zone: 'main', order: 0, rowSpan: 2 },
      { instanceId: 'i2', moduleId: 'news', enabled: false, zone: 'bottom', order: 1 },
    ];
    const ws = store.createWorkspace('With Placements', placements as any);
    assert.equal(ws.placements.length, 2);
    assert.equal(ws.placements[0].moduleId, 'markets');
    assert.equal(ws.placements[0].rowSpan, 2);
    assert.equal(ws.placements[1].zone, 'bottom');
  });

  it('getWorkspace returns workspace by id', () => {
    const store = newStore();
    const ws = store.createWorkspace('Find Me');
    const found = store.getWorkspace(ws.id);
    assert.deepEqual(found, ws);
  });

  it('getWorkspace returns null for missing id', () => {
    const store = newStore();
    store.createWorkspace('A');
    assert.equal(store.getWorkspace('missing-id'), null);
  });

  it('listWorkspaces returns all workspaces', () => {
    const store = newStore();
    const w1 = store.createWorkspace('First');
    const w2 = store.createWorkspace('Second');
    const list = store.listWorkspaces();
    assert.equal(list.length, 2);
    assert.ok(list.some((w) => w.id === w1.id));
    assert.ok(list.some((w) => w.id === w2.id));
  });

  it('updateWorkspace updates name and updated timestamp', () => {
    const store = newStore();
    const ws = store.createWorkspace('Original');
    const originalUpdated = ws.updated;
    ws.name = 'Renamed';
    const ok = store.updateWorkspace(ws);
    assert.equal(ok, true);
    assert.ok(ws.updated >= originalUpdated);

    const found = store.getWorkspace(ws.id);
    assert.equal(found?.name, 'Renamed');
    assert.ok(found!.updated >= originalUpdated);
  });

  it('updateWorkspace returns false for non-existent id', () => {
    const store = newStore();
    const ws = store.createWorkspace('A');
    const modified = { ...ws, id: 'non-existent', name: 'Modified' };
    assert.equal(store.updateWorkspace(modified), false);
  });

  it('renameWorkspace updates name', () => {
    const store = newStore();
    const ws = store.createWorkspace('Old Name');
    const ok = store.renameWorkspace(ws.id, 'New Name');
    assert.equal(ok, true);
    const found = store.getWorkspace(ws.id);
    assert.equal(found?.name, 'New Name');
  });

  it('renameWorkspace returns false for missing id', () => {
    const store = newStore();
    assert.equal(store.renameWorkspace('missing', 'Name'), false);
  });

  it('duplicateWorkspace creates independent copy with new instanceIds', () => {
    const store = newStore();
    const ws = store.createWorkspace('Original', [
      { instanceId: 'i1', moduleId: 'markets', enabled: true, zone: 'main', order: 0, rowSpan: 2 },
    ]);
    const copy = store.duplicateWorkspace(ws.id, 'Copy Name');
    assert.ok(copy);
    assert.notEqual(copy.id, ws.id);
    assert.equal(copy.name, 'Copy Name');
    assert.equal(copy.placements.length, 1);
    assert.notEqual(copy.placements[0].instanceId, ws.placements[0].instanceId);
    assert.equal(copy.placements[0].moduleId, 'markets');
    assert.equal(copy.placements[0].rowSpan, 2);

    const list = store.listWorkspaces();
    assert.equal(list.length, 2);
  });

  it('duplicateWorkspace without name generates default name', () => {
    const store = newStore();
    const ws = store.createWorkspace('My Workspace');
    const copy = store.duplicateWorkspace(ws.id);
    assert.ok(copy);
    assert.equal(copy.name, 'My Workspace Copy');
  });

  it('duplicateWorkspace returns null for missing id', () => {
    const store = newStore();
    assert.equal(store.duplicateWorkspace('missing'), null);
  });

  it('deleteWorkspace removes workspace', () => {
    const store = newStore();
    const ws = store.createWorkspace('To Delete');
    assert.equal(store.listWorkspaces().length, 1);
    const ok = store.deleteWorkspace(ws.id);
    assert.equal(ok, true);
    assert.equal(store.listWorkspaces().length, 0);
    assert.equal(store.loadState(), null);
    assert.equal(mockStorage.getItem(WORKSPACE_LIST_KEY), null);
    assert.equal(mockStorage.getItem(WORKSPACE_ACTIVE_KEY), null);
  });

  it('deleteWorkspace switches active workspace if deleted was active', () => {
    const store = newStore();
    const w1 = store.createWorkspace('First');
    const w2 = store.createWorkspace('Second');
    store.setActiveWorkspaceId(w1.id);

    const ok = store.deleteWorkspace(w1.id);
    assert.equal(ok, true);
    const state = store.loadState();
    assert.ok(state);
    assert.equal(state.activeWorkspaceId, w2.id);
  });

  it('deleteWorkspace returns false for missing id', () => {
    const store = newStore();
    assert.equal(store.deleteWorkspace('missing'), false);
  });

  it('getActiveWorkspaceId returns active id', () => {
    const store = newStore();
    const ws = store.createWorkspace('Active');
    const active = store.getActiveWorkspaceId();
    assert.equal(active, ws.id);
  });

  it('setActiveWorkspaceId changes active workspace', () => {
    const store = newStore();
    const w1 = store.createWorkspace('First');
    const w2 = store.createWorkspace('Second');
    assert.equal(store.setActiveWorkspaceId(w2.id), true);
    assert.equal(store.getActiveWorkspaceId(), w2.id);
  });

  it('setActiveWorkspaceId returns false for non-existent id', () => {
    const store = newStore();
    store.createWorkspace('A');
    assert.equal(store.setActiveWorkspaceId('missing'), false);
  });

  it('persists state across store instances', () => {
    const store1 = newStore();
    store1.createWorkspace('Persistent');

    const store2 = newStore();
    const list = store2.listWorkspaces();
    assert.equal(list.length, 1);
    assert.equal(list[0].name, 'Persistent');
  });

  it('validates workspace variant on load', () => {
    const store = newStore('full');
    store.createWorkspace('Valid');

    const raw = mockStorage.getItem(WORKSPACE_LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.workspaces[0].variant = 'tech';
      mockStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify(parsed));
    }

    const store2 = newStore('full');
    const state = store2.loadState();
    assert.equal(state, null);
  });

  it('recovers from corrupt JSON in storage', () => {
    const store = newStore();
    mockStorage.setItem(WORKSPACE_LIST_KEY, '{not valid json');
    const state = store.loadState();
    assert.equal(state, null);
  });

  it('recovers from non-array workspaces in storage', () => {
    const store = newStore();
    mockStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify({ version: 1, workspaces: 'not array', activeWorkspaceId: 'x' }));
    const state = store.loadState();
    assert.equal(state, null);
  });

  it('filters out invalid workspace entries', () => {
    const store = newStore();
    mockStorage.setItem(WORKSPACE_LIST_KEY, JSON.stringify({
      version: 1,
      workspaces: [
        { id: 'w1', name: 'Good', variant: 'full', placements: [], created: 1, updated: 1 },
        { id: 'w2', name: 123, variant: 'full', placements: [], created: 1, updated: 1 },
        { id: 'w3', name: 'BadVariant', variant: 'tech', placements: [], created: 1, updated: 1 },
      ],
      activeWorkspaceId: 'w1',
    }));
    const state = store.loadState();
    assert.ok(state);
    assert.equal(state!.workspaces.length, 1);
    assert.equal(state!.workspaces[0].name, 'Good');
  });

  it('migration from legacy tabs returns true and creates workspaces', () => {
    const store = newStore('full');
    const tabsState = {
      activeTabId: 'tab-1',
      tabs: [
        {
          id: 'tab-1',
          name: 'Tab One',
          panelSettings: { markets: { name: 'Markets', enabled: true } },
          panelOrder: ['markets'],
          bottomSet: [],
        },
        {
          id: 'tab-2',
          name: 'Tab Two',
          panelSettings: { news: { name: 'News', enabled: false } },
          panelOrder: ['news'],
          bottomSet: ['news'],
        },
      ],
    };
    mockStorage.setItem('worldmonitor-tabs-v1:full', JSON.stringify(tabsState));

    const ok = store.migrateFromLegacy();
    assert.equal(ok, true);

    const state = store.loadState();
    assert.ok(state);
    assert.equal(state.workspaces.length, 2);
    assert.ok(state.workspaces.some((w) => w.name === 'Tab One'));
    assert.ok(state.workspaces.some((w) => w.name === 'Tab Two'));

    const tabOne = state.workspaces.find((w) => w.name === 'Tab One');
    assert.ok(tabOne);
    assert.equal(tabOne.placements.length, 1);
    assert.equal(tabOne.placements[0].moduleId, 'markets');
    assert.equal(tabOne.placements[0].enabled, true);
    assert.equal(tabOne.placements[0].zone, 'main');

    const tabTwo = state.workspaces.find((w) => w.name === 'Tab Two');
    assert.ok(tabTwo);
    assert.equal(tabTwo.placements[0].zone, 'bottom');
    assert.equal(tabTwo.placements[0].enabled, false);
  });

  it('migration falls back to panel settings when tabs missing', () => {
    const store = newStore('full');
    mockStorage.setItem('worldmonitor-panels', JSON.stringify({
      markets: { name: 'Markets', enabled: true },
      news: { name: 'News', enabled: true },
    }));
    mockStorage.setItem('panel-order', JSON.stringify(['markets', 'news']));
    mockStorage.setItem('panel-order-bottom-set', JSON.stringify(['news']));
    mockStorage.setItem('worldmonitor-panel-spans', JSON.stringify({ markets: 2 }));
    mockStorage.setItem('worldmonitor-panel-col-spans', JSON.stringify({ news: 2 }));
    mockStorage.setItem('worldmonitor-panel-collapsed', JSON.stringify({ markets: true }));

    const ok = store.migrateFromLegacy();
    assert.equal(ok, true);

    const state = store.loadState();
    assert.ok(state);
    assert.equal(state.workspaces.length, 1);
    const ws = state.workspaces[0];
    assert.equal(ws.name, 'Default Workspace');
    assert.equal(ws.placements.length, 2);

    const marketsPlacement = ws.placements.find((p) => p.moduleId === 'markets');
    assert.ok(marketsPlacement);
    assert.equal(marketsPlacement.enabled, true);
    assert.equal(marketsPlacement.rowSpan, 2);
    assert.equal(marketsPlacement.collapsed, true);

    const newsPlacement = ws.placements.find((p) => p.moduleId === 'news');
    assert.ok(newsPlacement);
    assert.equal(newsPlacement.enabled, true);
    assert.equal(newsPlacement.zone, 'bottom');
    assert.equal(newsPlacement.colSpan, 2);
  });

  it('migration is idempotent: second call returns false', () => {
    const store = newStore('full');
    mockStorage.setItem('worldmonitor-tabs-v1:full', JSON.stringify({
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', name: 'Tab', panelSettings: {}, panelOrder: [], bottomSet: [] }],
    }));

    const first = store.migrateFromLegacy();
    assert.equal(first, true);

    const second = store.migrateFromLegacy();
    assert.equal(second, false);
  });

  it('migration does not touch legacy storage keys', () => {
    const store = newStore('full');
    const legacyTabs = 'worldmonitor-tabs-v1:full';
    const legacyPanels = 'worldmonitor-panels';
    const legacyOrder = 'panel-order';

    mockStorage.setItem(legacyTabs, JSON.stringify({
      activeTabId: 'tab-1',
      tabs: [{ id: 'tab-1', name: 'Tab', panelSettings: {}, panelOrder: [], bottomSet: [] }],
    }));
    mockStorage.setItem(legacyPanels, '{}');
    mockStorage.setItem(legacyOrder, '[]');

    store.migrateFromLegacy();

    assert.ok(mockStorage.getItem(legacyTabs));
    assert.ok(mockStorage.getItem(legacyPanels));
    assert.ok(mockStorage.getItem(legacyOrder));
  });

  it('per-variant isolation: workspaces do not leak across variants', () => {
    const storeFull = newStore('full');
    storeFull.createWorkspace('Full Workspace');

    const storeTech = newStore('tech');
    storeTech.createWorkspace('Tech Workspace');

    assert.equal(storeFull.listWorkspaces().length, 1);
    assert.equal(storeFull.listWorkspaces()[0].name, 'Full Workspace');
    assert.equal(storeTech.listWorkspaces().length, 1);
    assert.equal(storeTech.listWorkspaces()[0].name, 'Tech Workspace');
    assert.notEqual(storeFull.getActiveWorkspaceId(), storeTech.getActiveWorkspaceId());
  });

  it('handles missing storage (e.g., SSR / private browsing)', () => {
    const store = new WorkspaceStore('full', null);
    assert.equal(store.loadState(), null);
    store.createWorkspace('No Storage');
    assert.equal(store.loadState(), null);
    store.setActiveWorkspaceId('any');
    assert.equal(store.getActiveWorkspaceId(), null);
  });

  it('migration preserves active tab identity when names duplicate', () => {
    const store = newStore('full');
    mockStorage.setItem('worldmonitor-tabs-v1:full', JSON.stringify({
      activeTabId: 'tab-2',
      tabs: [
        { id: 'tab-1', name: 'Same', panelSettings: { markets: { name: 'Markets', enabled: true } }, panelOrder: ['markets'], bottomSet: [] },
        { id: 'tab-2', name: 'Same', panelSettings: { news: { name: 'News', enabled: true } }, panelOrder: ['news'], bottomSet: [] },
      ],
    }));

    assert.equal(store.migrateFromLegacy(), true);
    const state = store.loadState();
    assert.ok(state);
    const active = state.workspaces.find((workspace) => workspace.id === state.activeWorkspaceId);
    assert.equal(active?.placements[0]?.moduleId, 'news');
  });

  it('migration tolerates malformed optional layout maps', () => {
    const store = newStore('full');
    mockStorage.setItem('worldmonitor-panels', JSON.stringify({ markets: { name: 'Markets', enabled: true } }));
    mockStorage.setItem('panel-order', JSON.stringify(['markets']));
    mockStorage.setItem('worldmonitor-panel-spans', '{bad json');
    mockStorage.setItem('worldmonitor-panel-col-spans', '[]');
    mockStorage.setItem('worldmonitor-panel-collapsed', 'null');

    assert.equal(store.migrateFromLegacy(), true);
    const workspace = store.listWorkspaces()[0];
    assert.equal(workspace?.placements[0]?.moduleId, 'markets');
    assert.equal(workspace?.placements[0]?.rowSpan, undefined);
  });

  it('proGated and fontScale from legacy settings are preserved', () => {
    const store = newStore('full');
    mockStorage.setItem('worldmonitor-panels', JSON.stringify({
      markets: { name: 'Markets', enabled: true, proGated: true, fontScale: 1.5 },
    }));
    mockStorage.setItem('panel-order', JSON.stringify(['markets']));
    mockStorage.setItem('panel-order-bottom-set', JSON.stringify([]));

    store.migrateFromLegacy();

    const state = store.loadState();
    assert.ok(state);
    const marketsPlacement = state.workspaces[0].placements.find((p) => p.moduleId === 'markets');
    assert.ok(marketsPlacement);
    assert.equal(marketsPlacement.proGated, true);
    assert.equal(marketsPlacement.fontScale, 1.5);
  });
});