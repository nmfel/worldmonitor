import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createBrowserEnvironment } from './helpers/mini-dom.mts';
import type { TerminalHeader as TerminalHeaderType } from '../src/components/TerminalHeader.ts';

function snapshotGlobal(name: string) {
  return {
    exists: Object.prototype.hasOwnProperty.call(globalThis, name),
    value: (globalThis as any)[name],
  };
}

function defineGlobal(name: string, value: any): void {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}

function restoreGlobal(name: string, snapshot: ReturnType<typeof snapshotGlobal>): void {
  if (snapshot.exists) defineGlobal(name, snapshot.value);
  else delete (globalThis as any)[name];
}

const labels = {
  search: 'Search',
  fullscreen: 'Fullscreen',
  selectRegion: 'Select region',
  regions: [['global', 'Global'], ['asia', 'Asia']] as const,
};

describe('TerminalHeader', () => {
  let originalGlobals: Record<string, ReturnType<typeof snapshotGlobal>>;
  let TerminalHeader: typeof TerminalHeaderType;

  beforeEach(async () => {
    const browser = createBrowserEnvironment();
    originalGlobals = {
      document: snapshotGlobal('document'),
      window: snapshotGlobal('window'),
      HTMLElement: snapshotGlobal('HTMLElement'),
    };
    defineGlobal('document', browser.document);
    defineGlobal('window', browser.window);
    defineGlobal('HTMLElement', browser.HTMLElement);
    ({ TerminalHeader } = await import('../src/components/TerminalHeader.ts') as any);
  });

  afterEach(() => {
    for (const [name, snapshot] of Object.entries(originalGlobals)) restoreGlobal(name, snapshot);
  });

  it('renders compact workspace context and existing control contracts', () => {
    const header = new TerminalHeader({ workspaceName: 'Indonesia Desk', variant: 'full', isDesktopApp: false, labels });
    const root = header.getElement();

    assert.equal(root.classList.contains('terminal-header'), true);
    assert.equal(root.querySelector('.terminal-header-title')?.textContent, 'Indonesia Desk');
    assert.ok(root.querySelector('#regionSelect'));
    assert.ok(root.querySelector('#missionPresetMount'));
    assert.ok(root.querySelector('#searchBtn'));
    assert.ok(root.querySelector('#fullscreenBtn'));
    assert.ok(root.querySelector('#unifiedSettingsMount'));
    assert.ok(root.querySelector('#authWidgetMount'));
  });

  it('omits legacy navigation and workspace-mode share chrome', () => {
    const root = new TerminalHeader({ workspaceName: 'Desk', variant: 'full', isDesktopApp: false, labels }).getElement();

    assert.equal(root.querySelector('.variant-switcher'), null);
    assert.equal(root.querySelector('.logo'), null);
    assert.equal(root.querySelector('.status-indicator'), null);
    assert.equal(root.querySelector('#copyLinkBtn'), null);
    assert.equal(root.querySelector('#embedLinkBtn'), null);
  });

  it('updates workspace title without rebuilding header', () => {
    const header = new TerminalHeader({ workspaceName: 'Desk A', variant: 'full', isDesktopApp: false, labels });
    const root = header.getElement();

    header.setWorkspaceName('Desk B');

    assert.equal(root.querySelector('.terminal-header-title')?.textContent, 'Desk B');
  });

  it('keeps desktop and variant-specific utility behavior', () => {
    const desktop = new TerminalHeader({ workspaceName: 'Desk', variant: 'full', isDesktopApp: true, labels }).getElement();
    const happy = new TerminalHeader({ workspaceName: 'Desk', variant: 'happy', isDesktopApp: false, labels }).getElement();

    assert.equal(desktop.querySelector('#fullscreenBtn'), null);
    assert.ok(happy.querySelector('#tvModeBtn'));
  });
});
