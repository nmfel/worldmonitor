import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ALL_PANELS } from '../src/config/panels.ts';
import {
  getModule,
  getModuleForVariant,
  listModules,
  listModulesByCategory,
  listModulesForVariant,
  MODULE_CATEGORIES,
  type ModuleCategory,
  type ModuleMeta,
} from '../src/config/module-registry.ts';

describe('Module Registry', () => {
  it('resolves every fixed panel key in ALL_PANELS', () => {
    const keys = Object.keys(ALL_PANELS);
    const modules = listModules();
    assert.equal(modules.length, keys.length);
    for (const key of keys) {
      const module = getModule(key);
      assert.ok(module, `metadata must exist for key ${key}`);
      assert.equal(module.id, key);
    }
  });

  it('contains no duplicate module IDs', () => {
    const modules = listModules();
    const ids = new Set(modules.map((m) => m.id));
    assert.equal(ids.size, modules.length);
  });

  it('categorizes every module into a valid category', () => {
    const modules = listModules();
    for (const module of modules) {
      assert.ok(
        MODULE_CATEGORIES.includes(module.category),
        `category ${module.category} must be in MODULE_CATEGORIES`,
      );
    }
  });

  it('correctly maps to custom categories', () => {
    const map = getModule('map');
    assert.equal(map?.category, 'Geopolitics');

    const clock = getModule('world-clock');
    assert.equal(clock?.category, 'Utilities');

    const airline = getModule('airline-intel');
    assert.equal(airline?.category, 'Aviation');
  });

  it('exposes listModulesByCategory helpers', () => {
    const mapped = listModulesByCategory() as ReadonlyMap<ModuleCategory, readonly ModuleMeta[]>;
    assert.ok(mapped instanceof Map);
    assert.equal(mapped.size, MODULE_CATEGORIES.length);

    const newsList = listModulesByCategory('News') as readonly ModuleMeta[];
    assert.ok(Array.isArray(newsList));
    assert.ok(newsList.length > 0);
    assert.ok(newsList.every((m) => m.category === 'News'));
  });

  it('filters modules by variant membership', () => {
    const fullList = listModulesForVariant('full');
    const happyList = listModulesForVariant('happy');

    assert.ok(fullList.length > happyList.length);
    assert.ok(fullList.some((m) => m.id === 'live-webcams'));
    assert.ok(!happyList.some((m) => m.id === 'live-webcams'));
  });

  it('preserves and maps variant overrides', () => {
    const mapBase = getModule('map')!;
    assert.equal(mapBase.title, 'Global Map');

    const mapTech = getModuleForVariant('map', 'tech');
    assert.ok(mapTech);
    assert.equal(mapTech.title, 'Global Tech Map');
  });

  it('safely returns undefined for unknown keys or invalid variant requests', () => {
    assert.equal(getModule('unknown-id'), undefined);
    assert.equal(getModuleForVariant('unknown-id', 'full'), undefined);
    assert.equal(getModuleForVariant('live-webcams', 'happy'), undefined);
  });

  it('declares all modules as singleton-only and details correct capabilities', () => {
    const modules = listModules();
    for (const module of modules) {
      assert.equal(module.singleton, true);
      if (module.id === 'map') {
        assert.deepEqual(module.capabilities, ['hide', 'resize']);
      } else {
        assert.deepEqual(module.capabilities, ['hide', 'reorder', 'resize']);
      }
    }
  });

  it('identifies premium status', () => {
    const chat = getModule('chat-analyst')!;
    assert.equal(chat.premium, 'locked');

    const worldNews = getModule('politics')!;
    assert.equal(worldNews.premium, undefined);
  });
});
