import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createBrowserEnvironment } from './helpers/mini-dom.mts';
import { WorkspaceStore } from '../src/services/workspace-store.ts';
import type { WorkspaceSidebar as WorkspaceSidebarType } from '../src/components/WorkspaceSidebar.ts';

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
    return Array.from(this.store.keys())[index] ?? null;
  }
}

function snapshotGlobal(name: string) {
  return {
    exists: Object.prototype.hasOwnProperty.call(globalThis, name),
    value: (globalThis as any)[name],
  };
}

function restoreGlobal(name: string, snapshot: ReturnType<typeof snapshotGlobal>) {
  if (snapshot.exists) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: snapshot.value,
    });
  } else {
    delete (globalThis as any)[name];
  }
}

function defineGlobal(name: string, value: any) {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function click(element: EventTarget): void {
  element.dispatchEvent(new Event('click', { bubbles: true, cancelable: true }));
}

describe('WorkspaceSidebar UI', () => {
  let browserEnv: any;
  let originalGlobals: any;
  let mockStorage: MockStorage;
  let store: WorkspaceStore;
  let WorkspaceSidebar: typeof WorkspaceSidebarType;

  beforeEach(async () => {
    const mod = await import('../src/components/WorkspaceSidebar.ts');
    WorkspaceSidebar = mod.WorkspaceSidebar as any;
    browserEnv = createBrowserEnvironment();
    originalGlobals = {
      document: snapshotGlobal('document'),
      window: snapshotGlobal('window'),
      localStorage: snapshotGlobal('localStorage'),
      HTMLElement: snapshotGlobal('HTMLElement'),
      HTMLButtonElement: snapshotGlobal('HTMLButtonElement'),
      Node: snapshotGlobal('Node'),
    };

    defineGlobal('document', browserEnv.document);
    defineGlobal('window', browserEnv.window);
    defineGlobal('localStorage', browserEnv.localStorage);
    defineGlobal('HTMLElement', browserEnv.HTMLElement);
    defineGlobal('HTMLButtonElement', browserEnv.HTMLButtonElement);
    defineGlobal('Node', Object.getPrototypeOf(browserEnv.HTMLElement.prototype).constructor);

    mockStorage = new MockStorage();
    store = new WorkspaceStore('full', mockStorage);
    store.createWorkspace('Default Workspace', [
      { instanceId: 'i1', moduleId: 'map', enabled: true, zone: 'main', order: 0 },
    ]);
  });

  afterEach(() => {
    mockStorage.clear();
    restoreGlobal('document', originalGlobals.document);
    restoreGlobal('window', originalGlobals.window);
    restoreGlobal('localStorage', originalGlobals.localStorage);
    restoreGlobal('HTMLElement', originalGlobals.HTMLElement);
    restoreGlobal('HTMLButtonElement', originalGlobals.HTMLButtonElement);
    restoreGlobal('Node', originalGlobals.Node);
  });

  it('renders workspaces list correctly', () => {
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: () => true,
    });
    const el = sidebar.getElement();
    const rows = el.querySelectorAll('.workspace-sidebar-row');
    assert.equal(rows.length, 1);
    const select = rows[0]?.querySelector('.workspace-sidebar-workspace');
    assert.equal(select?.textContent, 'Default Workspace');
  });

  it('handles sidebar collapse and expand transitions', () => {
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: () => true,
    });
    const el = sidebar.getElement();
    const collapseButton = el.querySelector('.workspace-sidebar-collapse') as HTMLButtonElement;
    assert.ok(collapseButton);

    click(collapseButton);
    assert.equal(el.classList.contains('collapsed'), true);
    assert.equal(document.documentElement.classList.contains('wm-workspace-sidebar-collapsed'), true);

    click(collapseButton);
    assert.equal(el.classList.contains('collapsed'), false);
    assert.equal(document.documentElement.classList.contains('wm-workspace-sidebar-collapsed'), false);
  });

  it('can create a new workspace', () => {
    let activated = false;
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: () => {
        activated = true;
        return true;
      },
    });

    // Mock form overlay input submit
    const createButton = sidebar.getElement().querySelector('.workspace-sidebar-icon-btn') as HTMLButtonElement;
    assert.ok(createButton);
    click(createButton);

    const overlay = document.body.querySelector('.workspace-name-editor');
    assert.ok(overlay);
    const input = overlay.querySelector('input')!;
    input.value = 'Indonesia Markets';
    const form = overlay.querySelector('form')!;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    assert.equal(activated, true);
    const list = store.listWorkspaces();
    assert.equal(list.length, 2);
    assert.equal(list[1]?.name, 'Indonesia Markets');
  });

  it('switches workspaces and persists active state', () => {
    const second = store.createWorkspace('Markets', [
      { instanceId: 'i2', moduleId: 'markets', enabled: true, zone: 'main', order: 0 },
    ]);
    const first = store.listWorkspaces()[0]!;
    store.setActiveWorkspaceId(first.id);
    const activated: string[] = [];
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: (workspace) => {
        activated.push(workspace.id);
        return true;
      },
    });

    const row = [...sidebar.getElement().querySelectorAll('.workspace-sidebar-row')]
      .find((candidate) => candidate.dataset.workspaceId === second.id)!;
    click(row.querySelector('.workspace-sidebar-workspace')!);

    assert.deepEqual(activated, [second.id]);
    assert.equal(store.getActiveWorkspaceId(), second.id);
    const activeRow = [...sidebar.getElement().querySelectorAll('.workspace-sidebar-row')]
      .find((candidate) => candidate.dataset.workspaceId === second.id)!;
    assert.equal(activeRow.querySelector('.workspace-sidebar-workspace')?.getAttribute('aria-current'), 'page');
  });

  it('renames, duplicates, and deletes workspaces', async () => {
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: () => true,
      confirmDelete: () => Promise.resolve(true),
    });

    let row = sidebar.getElement().querySelector('.workspace-sidebar-row')!;
    click(row.querySelector('.workspace-sidebar-more')!);
    click(row.querySelectorAll('.workspace-sidebar-row-action')[0]!);
    const renameOverlay = document.body.querySelector('.workspace-name-editor')!;
    const renameInput = renameOverlay.querySelector('input') as HTMLInputElement;
    renameInput.value = 'Command Desk';
    renameOverlay.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    assert.equal(store.listWorkspaces()[0]?.name, 'Command Desk');

    row = sidebar.getElement().querySelector('.workspace-sidebar-row')!;
    click(row.querySelector('.workspace-sidebar-more')!);
    click(row.querySelectorAll('.workspace-sidebar-row-action')[1]!);
    assert.equal(store.listWorkspaces().length, 2);

    row = sidebar.getElement().querySelector('.workspace-sidebar-row')!;
    click(row.querySelector('.workspace-sidebar-more')!);
    click(row.querySelectorAll('.workspace-sidebar-row-action')[2]!);
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(store.listWorkspaces().length, 1);
  });

  it('searches and filters module library', () => {
    const sidebar = new WorkspaceSidebar({ store, variant: 'full', activate: () => true });
    click(sidebar.getElement().querySelector('.workspace-sidebar-action')!);
    const library = document.body.querySelector('.workspace-library')!;
    const search = library.querySelector('.workspace-library-search') as HTMLInputElement;
    search.value = 'Global Map';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const rows = [...library.querySelectorAll('.workspace-library-module')];
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.dataset.moduleId, 'map');


    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    const markets = [...library.querySelectorAll('.workspace-library-category')]
      .find((button) => button.textContent === 'Markets')!;
    click(markets);
    const filtered = library.querySelectorAll('.workspace-library-module');
    assert.ok(filtered.length > 0);
    assert.equal(filtered.every((row) => row.querySelector('.workspace-library-module-category')?.textContent === 'Markets'), true);
  });

  it('adds and removes singleton modules from active workspace', () => {
    const activated: string[] = [];
    const sidebar = new WorkspaceSidebar({
      store,
      variant: 'full',
      activate: (workspace) => {
        activated.push(workspace.id);
        return true;
      },
    });
    click(sidebar.getElement().querySelector('.workspace-sidebar-action')!);
    const library = document.body.querySelector('.workspace-library')!;
    const marketsRow = [...library.querySelectorAll('.workspace-library-module')]
      .find((row) => row.dataset.moduleId === 'markets')!;
    click(marketsRow.querySelector('.workspace-library-module-action')!);
    let workspace = store.getWorkspace(store.getActiveWorkspaceId()!)!;
    assert.equal(workspace.placements.filter((placement) => placement.moduleId === 'markets').length, 1);

    const refreshedRow = [...library.querySelectorAll('.workspace-library-module')]
      .find((row) => row.dataset.moduleId === 'markets')!;

    click(refreshedRow.querySelector('.workspace-library-module-action')!);
    workspace = store.getWorkspace(store.getActiveWorkspaceId()!)!;
    assert.equal(workspace.placements.some((placement) => placement.moduleId === 'markets'), false);
    assert.equal(activated.length, 2);
  });
});
