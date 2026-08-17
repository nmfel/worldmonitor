import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Panel } from '@/components/Panel';
import { initTestI18n } from './helpers/i18n.mts';
import {
  moduleSection,
  moduleMetric,
  moduleMetricRow,
  moduleBadge,
  moduleSeverity,
  moduleMeta,
  moduleState,
  moduleStatusRow,
} from '@/components/panel-content-primitives';

beforeAll(async () => {
  await initTestI18n();
});

class PrimitivesPanel extends Panel {
  constructor() {
    super({ id: 'primitives-panel', title: 'Primitives Panel' });
  }

  public writeNodes(...nodes: HTMLElement[]): void {
    this.setContentNodes(...nodes);
  }
}

describe('Module Content Primitives', () => {
  let panel: PrimitivesPanel;
  let container: HTMLElement;

  beforeEach(() => {
    panel = new PrimitivesPanel();
    container = (panel as unknown as { content: HTMLElement }).content;
    document.body.appendChild((panel as unknown as { element: HTMLElement }).element);
  });

  afterEach(() => {
    panel.destroy();
    document.body.innerHTML = '';
  });

  it('renders section and metadata correctly', () => {
    const meta = h('span', null, 'Section Meta');
    const section = moduleSection(
      [h('div', { className: 'test-child' }, 'child')],
      { title: 'Geopolitics', meta }
    );
    panel.writeNodes(section);

    expect(container.querySelector('.module-section-title')?.textContent).toBe('Geopolitics');
    expect(container.querySelector('.module-section-header-meta')?.textContent).toBe('Section Meta');
    expect(container.querySelector('.test-child')?.textContent).toBe('child');
  });

  it('renders metrics and delta indicators correctly', () => {
    const metric1 = moduleMetric({
      label: 'Oil Price',
      value: '$78.50',
      detail: 'Brent Crude',
      delta: { value: '+2.4%', direction: 'up' },
    });
    const row = moduleMetricRow([metric1]);
    panel.writeNodes(row);

    expect(container.querySelector('.module-metric-label')?.textContent).toBe('Oil Price');
    expect(container.querySelector('.module-metric-value')?.textContent).toBe('$78.50');
    expect(container.querySelector('.module-metric-detail')?.textContent).toBe('Brent Crude');
    expect(container.querySelector('.module-delta-up')?.textContent).toBe('+2.4%');
  });

  it('renders status indicators, badges, and severity correctly', () => {
    const badge = moduleBadge('LIVE', 'success');
    const severity = moduleSeverity('CRITICAL', 'critical');
    const statusRow = moduleStatusRow({ label: 'System status', value: 'ONLINE', tone: 'success', detail: 'latency 4ms' });
    panel.writeNodes(badge, severity, statusRow);

    expect(container.querySelector('.module-badge.module-tone-success')?.textContent).toBe('LIVE');
    expect(container.querySelector('.module-severity.module-tone-critical')?.textContent).toBe('CRITICAL');
    expect(container.querySelector('.module-status-label')?.textContent).toBe('System status');
    expect(container.querySelector('.module-status-value.module-tone-success')?.textContent).toBe('ONLINE');
    expect(container.querySelector('.module-status-detail')?.textContent).toBe('latency 4ms');
  });

  it('renders module states (empty, loading, error, unavailable)', () => {
    const emptyState = moduleState({
      kind: 'empty',
      title: 'No reports found',
      message: 'Adjust filter parameters',
    });
    panel.writeNodes(emptyState);

    expect(container.querySelector('.module-state-empty')).not.toBeNull();
    expect(container.querySelector('.module-state-title')?.textContent).toBe('No reports found');
    expect(container.querySelector('.module-state-message')?.textContent).toBe('Adjust filter parameters');
  });

  it('renders meta rows and context actions correctly', () => {
    const action = h('button', { className: 'action-btn' }, 'x');
    const metaRow = moduleMeta(
      [
        { label: 'Source', value: 'GDELT', kind: 'source' },
        { label: 'Freshness', value: '2 hours ago', kind: 'freshness' },
      ],
      [action]
    );
    panel.writeNodes(metaRow);

    expect(container.querySelector('.module-meta-source')?.textContent).toBe('Source: GDELT');
    expect(container.querySelector('.module-meta-freshness')?.textContent).toBe('Freshness: 2 hours ago');
    expect(container.querySelector('.action-btn')?.textContent).toBe('x');
  });
});

function h(tag: string, props: Record<string, any> | null, ...children: any[]): HTMLElement {
  const el = document.createElement(tag);
  if (props) {
    for (const key in props) {
      if (key === 'className') el.className = props[key];
      else el.setAttribute(key, props[key]);
    }
  }
  for (const child of children) {
    if (child == null) continue;
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}
