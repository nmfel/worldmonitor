import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const source = readFileSync(new URL('../src/app/panel-layout.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.ts', import.meta.url), 'utf8');
const dataLoaderSource = readFileSync(new URL('../src/app/data-loader.ts', import.meta.url), 'utf8');

describe('PanelLayoutManager workspace integration', () => {
  it('keeps legacy tabs behind workspace mode guard', () => {
    assert.match(source, /if \(isWorkspaceModeEnabled\(\)\)[\s\S]*?return;[\s\S]*?const mount = document\.getElementById\('panelTabsMount'\)/);
  });

  it('exposes workspace activation without replacing panel instances', () => {
    assert.match(source, /public activateWorkspace\(workspace: Workspace\): boolean/);
    assert.match(source, /this\.ctx\.panelSettings = activation\.panelSettings/);
    assert.doesNotMatch(source, /activateWorkspace[\s\S]{0,2000}\.destroy\(\)/);
  });

  it('uses current layout and visibility pipelines', () => {
    assert.match(source, /this\.applyPanelSettings\(changedKeys\)/);
    assert.match(source, /this\.applySavedPanelOrder\(\)/);
    assert.match(source, /this\.applyWorkspaceLayout\(activation\.placements\)/);
  });

  it('keeps map handling in existing special branch', () => {
    assert.match(source, /if \(key === 'map'\)[\s\S]*?mapSection\.classList\.toggle\('hidden'/);
  });

  it('checks current settings after lazy mount completion', () => {
    assert.match(source, /private afterPanelMounted\(key: string, panel: Panel\)[\s\S]*?const config = this\.ctx\.panelSettings\[key\][\s\S]*?panel\.toggle\(config\.enabled\)/);
  });

  it('applies workspace spans and column spans to element classLists', () => {
    assert.match(source, /placement\.rowSpan !== undefined[\s\S]*?classList\.add\(`span-\${placement\.rowSpan}`\)/);
    assert.match(source, /placement\.colSpan !== undefined[\s\S]*?classList\.add\(`col-span-\${placement\.colSpan}`\)/);
  });

  it('triggers collapse actions via collapseButton click', () => {
    assert.match(source, /collapseButton && elementCollapsed !== targetCollapsed[\s\S]*?collapseButton\.click\(\)/);
  });

  it('omits presentation-only commercial, community, and workspace footer shell chrome', () => {
    assert.doesNotMatch(source, /proBannerSlot|>Pricing<|>Blog<|>Discord<|>X<|discord\.gg\/re63kWKxaz|x\.com\/worldmonitorai/);
    assert.doesNotMatch(appSource, /showProBanner\(/);
    assert.doesNotMatch(dataLoaderSource, /mountCommunityWidget\(/);
    assert.match(source, /\$\{workspaceModeEnabled \? '' : `/);
  });

  it('preserves service and legal shell links', () => {
    assert.match(source, />Docs</);
    assert.match(source, />Status</);
    assert.match(source, />GitHub</);
    assert.match(source, /footerDownloadMount/);
    assert.match(source, /site-footer-copy/);
    assert.match(source, /authWidgetMount/);
  });

  it('replaces only workspace-mode header and preserves legacy fallback', () => {
    assert.match(source, /if \(isWorkspaceModeEnabled\(\)\)[\s\S]*?new TerminalHeader\(/);
    assert.match(source, /querySelector\('\.header'\)\?\.replaceWith\(this\.terminalHeader\.getElement\(\)\)/);
    assert.match(source, /if \(isWorkspaceModeEnabled\(\)\)[\s\S]*?return;[\s\S]*?panelTabsMount/);
  });

  it('keeps workspace title synchronized during activation', () => {
    assert.match(source, /activateWorkspace\(workspace: Workspace\)[\s\S]*?terminalHeader\?\.setWorkspaceName\(workspace\.name\)/);
  });
});
