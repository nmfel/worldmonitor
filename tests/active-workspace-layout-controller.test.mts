import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ActiveWorkspaceLayoutController } from '../src/services/active-workspace-layout-controller.ts';
import { WorkspaceStore } from '../src/services/workspace-store.ts';

class MockStorage implements Storage {
  private values = new Map<string, string>();
  get length(): number { return this.values.size; }
  clear(): void { this.values.clear(); }
  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  key(index: number): string | null { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string): void { this.values.delete(key); }
  setItem(key: string, value: string): void { this.values.set(key, value); }
}

function setup() {
  const storage = new MockStorage();
  const store = new WorkspaceStore('full', storage);
  const a = store.createWorkspace('A', [
    { instanceId: 'map-a', moduleId: 'map', enabled: true, zone: 'main', order: 0 },
    { instanceId: 'markets-a', moduleId: 'markets', enabled: true, zone: 'main', order: 1 },
    { instanceId: 'intel-a', moduleId: 'intel', enabled: false, zone: 'bottom', order: 2 },
  ]);
  const b = store.createWorkspace('B', [
    { instanceId: 'map-b', moduleId: 'map', enabled: true, zone: 'main', order: 0 },
    { instanceId: 'markets-b', moduleId: 'markets', enabled: true, zone: 'main', order: 1, rowSpan: 4 },
  ]);
  store.setActiveWorkspaceId(a.id);
  const controller = new ActiveWorkspaceLayoutController(store, () => true);
  return { storage, store, controller, a, b };
}

describe('ActiveWorkspaceLayoutController', () => {
  it('persists row, column, collapse, visibility, and font scale per workspace', () => {
    const { store, controller, a, b } = setup();
    controller.setSpan('markets', 'rowSpan', 3);
    controller.setSpan('markets', 'colSpan', 2);
    controller.setCollapsed('markets', true);
    controller.setEnabled('markets', false, { name: 'Markets', enabled: false, fontScale: 1.25 });

    const updatedA = store.getWorkspace(a.id)!;
    const marketsA = updatedA.placements.find((placement) => placement.moduleId === 'markets')!;
    assert.equal(marketsA.rowSpan, 3);
    assert.equal(marketsA.colSpan, 2);
    assert.equal(marketsA.collapsed, true);
    assert.equal(marketsA.enabled, false);
    assert.equal(marketsA.fontScale, 1.25);
    assert.equal(store.getWorkspace(b.id)!.placements.find((placement) => placement.moduleId === 'markets')!.rowSpan, 4);
  });

  it('persists order and zones without dropping disabled placements', () => {
    const { store, controller, a } = setup();
    controller.replaceOrder(['markets', 'map'], new Set(['markets']));

    const placements = store.getWorkspace(a.id)!.placements;
    assert.deepEqual(placements.map((placement) => placement.moduleId), ['markets', 'map', 'intel']);
    assert.deepEqual(placements.map((placement) => placement.order), [0, 1, 2]);
    assert.equal(placements[0]?.zone, 'bottom');
    assert.equal(placements[1]?.zone, 'main');
    assert.equal(placements[2]?.enabled, false);
  });

  it('upserts enabled fixed modules and ignores unknown modules', () => {
    const { store, controller, a } = setup();
    assert.equal(controller.setEnabled('economic', true, { name: 'Economic', enabled: true }), true);
    assert.equal(controller.setEnabled('not-a-module', true), false);
    const economic = store.getWorkspace(a.id)!.placements.find((placement) => placement.moduleId === 'economic');
    assert.equal(economic?.enabled, true);
    assert.equal(economic?.zone, 'main');
  });

  it('suppresses persistence while applying a workspace', () => {
    const { store, controller, a } = setup();
    controller.runApplying(() => {
      assert.equal(controller.setCollapsed('markets', true), false);
      assert.equal(controller.setSpan('markets', 'rowSpan', 4), false);
    });
    const markets = store.getWorkspace(a.id)!.placements.find((placement) => placement.moduleId === 'markets')!;
    assert.equal(markets.collapsed, undefined);
    assert.equal(markets.rowSpan, undefined);
  });

  it('keeps feature flag OFF behavior workspace-write free', () => {
    const { store, a } = setup();
    const controller = new ActiveWorkspaceLayoutController(store, () => false);
    assert.equal(controller.setCollapsed('markets', true), false);
    assert.equal(controller.replaceOrder(['markets', 'map'], new Set()), false);
    assert.equal(store.getWorkspace(a.id)!.placements.find((placement) => placement.moduleId === 'markets')!.collapsed, undefined);
  });

  it('keeps rapid A to B to A mutations isolated', () => {
    const { store, controller, a, b } = setup();
    controller.setSpan('markets', 'rowSpan', 2);
    store.setActiveWorkspaceId(b.id);
    controller.setSpan('markets', 'rowSpan', 3);
    store.setActiveWorkspaceId(a.id);
    controller.setCollapsed('markets', true);

    const marketsA = store.getWorkspace(a.id)!.placements.find((placement) => placement.moduleId === 'markets')!;
    const marketsB = store.getWorkspace(b.id)!.placements.find((placement) => placement.moduleId === 'markets')!;
    assert.equal(marketsA.rowSpan, 2);
    assert.equal(marketsA.collapsed, true);
    assert.equal(marketsB.rowSpan, 3);
    assert.equal(marketsB.collapsed, undefined);
  });

  it('reloads active workspace layout from persisted storage', () => {
    const { storage, store, controller, a } = setup();
    controller.setSpan('markets', 'rowSpan', 3);
    controller.setCollapsed('markets', true);
    const reloaded = new WorkspaceStore('full', storage);
    assert.equal(reloaded.getActiveWorkspaceId(), a.id);
    const markets = reloaded.getWorkspace(a.id)!.placements.find((placement) => placement.moduleId === 'markets')!;
    assert.equal(markets.rowSpan, 3);
    assert.equal(markets.collapsed, true);
  });
});
