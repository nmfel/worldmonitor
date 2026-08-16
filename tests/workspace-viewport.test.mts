import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const css = readFileSync(new URL('../src/styles/workspace-sidebar.css', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/app/panel-layout.ts', import.meta.url), 'utf8');

function desktopRuleContaining(fragment: string): string {
  const blocks = css.match(/@media \(min-width: 769px\) \{[\s\S]*?\n\}/g) ?? [];
  const combined = blocks.join('\n');
  assert.match(combined, new RegExp(fragment));
  return combined;
}

describe('workspace fixed viewport shell', () => {
  it('scopes viewport lock to workspace desktop mode', () => {
    assert.match(css, /@media \(min-width: 769px\)[\s\S]*?html\.wm-workspace-sidebar body[\s\S]*?height: 100dvh[\s\S]*?overflow: hidden/);
    assert.match(css, /html\.wm-workspace-sidebar #app[\s\S]*?height: 100dvh[\s\S]*?overflow: hidden/);
    assert.doesNotMatch(css, /^body\s*\{[\s\S]*?100dvh/m);
  });

  it('assigns panel grid as desktop workspace scroll owner', () => {
    desktopRuleContaining('html\\.wm-workspace-sidebar #panelsGrid');
    assert.match(css, /html\.wm-workspace-sidebar #panelsGrid[\s\S]*?overflow-y: auto[\s\S]*?overscroll-behavior: contain/);
    assert.match(css, /html\.wm-workspace-sidebar \.main-content[\s\S]*?overflow: hidden/);
  });

  it('keeps map and panel grid in bounded mid-desktop rows', () => {
    assert.match(css, /@media \(min-width: 769px\) and \(max-width: 1599px\)[\s\S]*?grid-template-rows: minmax\(240px, 45%\) minmax\(0, 1fr\)/);
    assert.match(css, /> #mapSection[\s\S]*?height: auto[\s\S]*?min-height: 0[\s\S]*?max-height: none/);
    assert.match(css, /\.map-hidden[\s\S]*?grid-template-rows: minmax\(0, 1fr\)/);
  });

  it('preserves mobile full-width fallback', () => {
    assert.match(css, /@media \(max-width: 768px\)[\s\S]*?\.workspace-sidebar[\s\S]*?display: none/);
    assert.match(css, /html\.wm-workspace-sidebar #app,[\s\S]*?html\.wm-workspace-sidebar-collapsed #app[\s\S]*?width: 100%[\s\S]*?margin-left: 0/);
  });

  it('restores per-workspace panel-grid scroll position without touching window scroll', () => {
    assert.match(layout, /workspaceScrollPositions = new Map<string, number>/);
    assert.match(layout, /workspaceScrollPositions\.set\(outgoingId, panelsGrid\.scrollTop\)/);
    assert.match(layout, /requestAnimationFrame\(\(\) => \{[\s\S]*?panelsGrid\.scrollTop = Math\.max/);
    assert.doesNotMatch(layout, /window\.scrollTo\(/);
  });
});
