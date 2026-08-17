import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initTestI18n } from './helpers/i18n.mts';
import type { FredSeries } from '@/services/economic';
import type { GetEconomicStressResponse } from '@/generated/client/worldmonitor/economic/v1/service_client';

vi.mock('@/services/bootstrap', () => ({
  getHydratedData: vi.fn(() => undefined),
  ensureHydrated: vi.fn(() => Promise.resolve()),
}));

import { EconomicPanel } from '@/components/EconomicPanel';

beforeAll(async () => {
  await initTestI18n();
});

afterEach(() => {
  document.body.replaceChildren();
});

const CONTENT_DEBOUNCE_MS = 150;
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(CONTENT_DEBOUNCE_MS + 1);
}

function mockFredSeries(): FredSeries[] {
  return [
    { id: 'VIXCLS', name: 'CBOE Volatility Index', value: 16.5, change: 0.5, previousValue: 16, changePercent: 3.1, unit: '', date: '2026-08-01', observations: [] },
    { id: 'T10Y2Y', name: '10Y-2Y Treasury Spread', value: -0.15, change: -0.05, previousValue: -0.1, changePercent: 50, unit: '%', date: '2026-08-01', observations: [] },
    { id: 'FEDFUNDS', name: 'Federal Funds Effective Rate', value: 5.3, change: 0, previousValue: 5.3, changePercent: 0, unit: '%', date: '2026-08-01', observations: [] },
    { id: 'UNRATE', name: 'Unemployment Rate', value: 4.1, change: 0.1, previousValue: 4, changePercent: 2.5, unit: '%', date: '2026-08-01', observations: [] },
  ];
}

function mockStressData(): GetEconomicStressResponse {
  return {
    compositeScore: 45.2,
    label: 'Elevated Stress',
    components: [
      { id: 'VIXCLS', label: 'Market Volatility', score: 38, rawValue: 16.5, missing: false, weight: 1 },
      { id: 'T10Y2Y', label: 'Yield Inversion', score: 55, rawValue: -0.15, missing: false, weight: 1 },
    ],
    seededAt: '2026-08-01T12:00:00Z',
    unavailable: false,
  };
}

describe('EconomicPanel Phase 1D-4B presentation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders indicators list and maps pressure card to module-state visual classes', async () => {
    const panel = new EconomicPanel();
    document.body.appendChild(panel.getElement());
    panel.update(mockFredSeries());
    await flush();

    const tabs = panel.getElement().querySelectorAll('.module-tabs .panel-tab');
    expect(tabs).toHaveLength(2); // Indicators and Stress Index
    expect(tabs[0]?.classList.contains('module-tab')).toBe(true);

    const pressureCard = panel.getElement().querySelector('.macro-pressure-card');
    expect(pressureCard?.classList.contains('module-state')).toBe(true);
    expect(pressureCard?.querySelector('.module-state-title')?.textContent).toBe('Watch');
    expect(pressureCard?.querySelector('.module-state-message')).not.toBeNull();

    const indicatorRows = panel.getElement().querySelectorAll('.economic-indicator');
    expect(indicatorRows).toHaveLength(4);
    expect(indicatorRows[0]?.classList.contains('module-status-row')).toBe(true);
    expect(indicatorRows[0]?.querySelector('.indicator-name')?.classList.contains('module-status-label')).toBe(true);
    expect(indicatorRows[0]?.querySelector('.value')?.classList.contains('module-status-value')).toBe(true);
    expect(indicatorRows[0]?.querySelector('.change')?.classList.contains('module-delta')).toBe(true);

    panel.destroy();
  });

  it('renders stress index components using progress bar math and color tones', async () => {
    const panel = new EconomicPanel();
    document.body.appendChild(panel.getElement());
    panel.update(mockFredSeries());
    panel.updateStress(mockStressData());
    await flush();

    const stressTab = panel.getElement().querySelector('.panel-tab[data-tab="stress"]') as HTMLElement;
    stressTab.click();
    await flush();

    const scoreTitle = panel.getElement().textContent;
    expect(scoreTitle).toContain('45.2');
    expect(scoreTitle).toContain('Elevated Stress');

    panel.destroy();
  });
});
