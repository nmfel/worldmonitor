import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initTestI18n } from './helpers/i18n.mts';
import type { CachedRiskScores } from '@/services/cached-risk-scores';

vi.mock('@/services/followed-countries', () => ({
  getFollowed: () => [],
  isFollowFeatureEnabled: () => false,
  subscribe: () => () => {},
}));

vi.mock('@/utils/follow-button', () => ({
  renderFollowButton: () => ({ html: '', attach: () => () => {} }),
}));

import { CIIPanel } from '@/components/CIIPanel';

beforeAll(async () => {
  await initTestI18n();
});

afterEach(() => {
  document.body.replaceChildren();
});

function cachedScores(): CachedRiskScores {
  return {
    cii: [
      {
        code: 'ID',
        name: 'Indonesia',
        score: 68,
        level: 'high',
        trend: 'rising',
        change24h: 3,
        components: { unrest: 22, conflict: 10, security: 18, information: 18 },
        lastUpdated: null,
      },
      {
        code: 'SG',
        name: 'Singapore',
        score: 24,
        level: 'low',
        trend: 'stable',
        change24h: 0,
        components: { unrest: 4, conflict: 2, security: 8, information: 10 },
        lastUpdated: null,
      },
    ],
    strategicRisk: {
      score: 68,
      level: 'high',
      trend: 'rising',
      lastUpdated: null,
      contributors: [],
    },
    protestCount: 0,
    computedAt: null,
    cached: true,
    degraded: false,
    stale: false,
  };
}

describe('Phase 1D-3 Country Instability presentation', () => {
  it('preserves score order and renders shared ranked-row primitives', () => {
    const panel = new CIIPanel();
    document.body.appendChild(panel.getElement());
    panel.renderFromCached(cachedScores());

    const rows = [...panel.getElement().querySelectorAll<HTMLElement>('.cii-country')];
    expect(rows.map((row) => row.dataset.code)).toEqual(['ID', 'SG']);
    expect(rows.every((row) => row.classList.contains('module-event-row'))).toBe(true);
    expect(rows[0]?.querySelector('.cii-score')?.textContent).toBe('68');
    expect(rows[0]?.querySelector('.trend-up')?.textContent).toBe('↑3');
    expect(rows[0]?.querySelectorAll('.cii-components .module-badge')).toHaveLength(4);

    panel.destroy();
  });

  it('preserves country click and unavailable-state behavior', () => {
    const panel = new CIIPanel();
    document.body.appendChild(panel.getElement());
    const clicked = vi.fn();
    panel.setCountryClickHandler(clicked);
    panel.renderFromCached(cachedScores());

    panel.getElement().querySelector<HTMLElement>('[data-code="ID"]')?.click();
    expect(clicked).toHaveBeenCalledWith('ID');

    panel.renderUnavailable();
    expect(panel.getElement().querySelector('.module-state-unavailable')).not.toBeNull();
    expect(panel.getScores()).toEqual([]);

    panel.destroy();
  });
});
