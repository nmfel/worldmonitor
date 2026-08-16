import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { buildActivationState, getChangedModuleIds } from '../src/services/workspace-activation.ts';
import type { Workspace } from '../src/services/workspace-store.ts';
import type { PanelConfig } from '../src/types/index.ts';

describe('Workspace Activation State Builder', () => {
  let workspace: Workspace;
  let currentSettings: any;

  beforeEach(() => {
    workspace = {
      id: 'w1',
      name: 'Test',
      variant: 'full',
      placements: [
        { instanceId: 'i1', moduleId: 'markets', enabled: true, zone: 'main', order: 1, rowSpan: 2 },
        { instanceId: 'i2', moduleId: 'politics', enabled: false, zone: 'bottom', order: 0, colSpan: 3, collapsed: true },
      ],
      created: 1,
      updated: 1,
    };

    currentSettings = {
      markets: { name: 'Markets', enabled: false, fontScale: 1 },
      politics: { name: 'World News', enabled: true, fontScale: 1 },
      gdelt: { name: 'GDELT', enabled: true },
    };
  });

  it('builds correct panelSettings, order, and bottomSet from placements', () => {
    const res = buildActivationState(workspace, currentSettings);

    assert.equal(res.panelOrder.length, 2);
    assert.deepEqual(res.panelOrder, ['politics', 'markets']);
    assert.deepEqual(res.bottomSet, ['politics']);

    assert.equal(res.panelSettings.markets?.enabled, true);
    assert.equal(res.panelSettings.politics?.enabled, false);
    assert.equal(res.panelSettings.gdelt?.enabled, false);
  });

  it('ignores placements with unknown module IDs', () => {
    workspace.placements.push({
      instanceId: 'i3',
      moduleId: 'unknown-module',
      enabled: true,
      zone: 'main',
      order: 2,
    });

    const res = buildActivationState(workspace, currentSettings);
    assert.equal(res.panelOrder.length, 2);
    assert.deepEqual(res.panelOrder, ['politics', 'markets']);
    assert.equal(res.panelSettings['unknown-module'], undefined);
  });

  it('tolerates malformed placement input objects', () => {
    workspace.placements.push(null as any);
    workspace.placements.push('bad-placement' as any);
    workspace.placements.push({ moduleId: 123 } as any);

    const res = buildActivationState(workspace, currentSettings);
    assert.equal(res.panelOrder.length, 2);
  });

  it('supports A to B to A visibility and order transitions', () => {
    const workspaceB: Workspace = {
      ...workspace,
      id: 'w2',
      placements: [
        { instanceId: 'i3', moduleId: 'politics', enabled: true, zone: 'main', order: 0 },
      ],
    };
    const stateA = buildActivationState(workspace, currentSettings);
    const stateB = buildActivationState(workspaceB, stateA.panelSettings);
    const restoredA = buildActivationState(workspace, stateB.panelSettings);

    assert.equal(stateA.panelSettings.markets?.enabled, true);
    assert.equal(stateB.panelSettings.markets?.enabled, false);
    assert.equal(stateB.panelSettings.politics?.enabled, true);
    assert.equal(restoredA.panelSettings.markets?.enabled, true);
    assert.equal(restoredA.panelSettings.politics?.enabled, false);
    assert.deepEqual(restoredA.panelOrder, stateA.panelOrder);
    assert.deepEqual(restoredA.bottomSet, stateA.bottomSet);
  });

  it('is idempotent when the same workspace is activated twice', () => {
    const first = buildActivationState(workspace, currentSettings);
    const second = buildActivationState(workspace, first.panelSettings);
    assert.deepEqual(second.panelSettings, first.panelSettings);
    assert.deepEqual(second.panelOrder, first.panelOrder);
    assert.deepEqual(second.bottomSet, first.bottomSet);
    assert.deepEqual(getChangedModuleIds(first.panelSettings, second.panelSettings), []);
  });

  it('keeps map in activation state as a singleton module', () => {
    const mapWorkspace: Workspace = {
      ...workspace,
      placements: [
        { instanceId: 'map-instance', moduleId: 'map', enabled: true, zone: 'main', order: 0 },
      ],
    };
    const settings = { map: { name: 'Global Map', enabled: false } };
    const result = buildActivationState(mapWorkspace, settings);
    assert.equal(result.panelSettings.map?.enabled, true);
    assert.deepEqual(result.panelOrder, ['map']);
  });

  it('correctly identifies diff-based changes via getChangedModuleIds', () => {
    const nextSettings: Record<string, PanelConfig> = {
      markets: { name: 'Markets', enabled: true, fontScale: 1 },
      politics: { name: 'World News', enabled: true, fontScale: 1.5 },
      gdelt: { name: 'GDELT', enabled: true },
    };

    const changed = getChangedModuleIds(currentSettings, nextSettings);
    assert.equal(changed.length, 2);
    assert.ok(changed.includes('markets'));
    assert.ok(changed.includes('politics'));
    assert.ok(!changed.includes('gdelt'));
  });
});
