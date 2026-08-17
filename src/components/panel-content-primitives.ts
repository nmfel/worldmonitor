import { type DomChild, h } from '@/utils/dom-utils';

export type ModuleTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical' | 'unavailable';
export type ModuleStateKind = 'empty' | 'loading' | 'stale' | 'unavailable' | 'degraded' | 'error';
export type ModuleDeltaDirection = 'up' | 'down' | 'flat';

function toneClass(tone: ModuleTone): string {
  return `module-tone-${tone}`;
}

export function moduleSection(children: DomChild[], options: { title?: string; meta?: DomChild } = {}): HTMLElement {
  const header = options.title || options.meta
    ? h('div', { className: 'module-section-header' },
      options.title ? h('h3', { className: 'module-section-title' }, options.title) : null,
      options.meta ? h('div', { className: 'module-section-header-meta' }, options.meta) : null,
    )
    : null;
  return h('section', { className: 'module-section' }, header, ...children);
}

export function moduleMetric(options: {
  label: string;
  value: string;
  detail?: string;
  delta?: { value: string; direction: ModuleDeltaDirection };
}): HTMLElement {
  return h('div', { className: 'module-metric' },
    h('span', { className: 'module-metric-label' }, options.label),
    h('span', { className: 'module-metric-value' }, options.value),
    options.delta ? moduleDelta(options.delta.value, options.delta.direction) : null,
    options.detail ? h('span', { className: 'module-metric-detail' }, options.detail) : null,
  );
}

export function moduleMetricRow(metrics: HTMLElement[]): HTMLElement {
  return h('div', { className: 'module-metric-row' }, ...metrics);
}

export function moduleDelta(value: string, direction: ModuleDeltaDirection): HTMLElement {
  return h('span', { className: `module-delta module-delta-${direction}` }, value);
}

export function moduleBadge(label: string, tone: ModuleTone = 'neutral'): HTMLElement {
  return h('span', { className: `module-badge ${toneClass(tone)}` }, label);
}

export function moduleSeverity(label: string, tone: Exclude<ModuleTone, 'neutral' | 'unavailable'>): HTMLElement {
  return h('span', { className: `module-severity ${toneClass(tone)}` },
    h('span', { className: 'module-severity-indicator', 'aria-hidden': 'true' }),
    label,
  );
}

export function moduleMeta(items: Array<{ label?: string; value: string; kind?: 'source' | 'freshness' | 'timestamp' }>, actions: DomChild[] = []): HTMLElement {
  return h('div', { className: 'module-meta' },
    h('div', { className: 'module-meta-items' },
      ...items.map((item) => h('span', { className: `module-meta-item${item.kind ? ` module-meta-${item.kind}` : ''}` },
        item.label ? h('span', { className: 'module-meta-label' }, `${item.label}: `) : null,
        h('span', { className: 'module-meta-value' }, item.value),
      )),
    ),
    actions.length ? h('div', { className: 'module-context-actions' }, ...actions) : null,
  );
}

export function moduleState(options: {
  kind: ModuleStateKind;
  title: string;
  message?: string;
  detail?: string;
  action?: DomChild;
}): HTMLElement {
  return h('div', { className: `module-state module-state-${options.kind}`, role: options.kind === 'error' ? 'alert' : 'status' },
    h('span', { className: 'module-state-indicator', 'aria-hidden': 'true' }),
    h('div', { className: 'module-state-body' },
      h('strong', { className: 'module-state-title' }, options.title),
      options.message ? h('span', { className: 'module-state-message' }, options.message) : null,
      options.detail ? h('span', { className: 'module-state-detail' }, options.detail) : null,
    ),
    options.action ? h('div', { className: 'module-state-action' }, options.action) : null,
  );
}

export function moduleToolbar(children: DomChild[]): HTMLElement {
  return h('div', { className: 'module-toolbar', role: 'toolbar' }, ...children);
}

export function moduleFilter(label: string, active = false): HTMLButtonElement {
  return h('button', { className: `module-filter${active ? ' active' : ''}`, type: 'button', 'aria-pressed': String(active) }, label) as HTMLButtonElement;
}

export function moduleTabs(tabs: Array<{ id: string; label: string; active?: boolean }>, label: string): HTMLElement {
  return h('div', { className: 'module-tabs', role: 'tablist', 'aria-label': label },
    ...tabs.map((tab) => h('button', {
      className: `module-tab${tab.active ? ' active' : ''}`,
      type: 'button',
      role: 'tab',
      dataset: { tab: tab.id },
      'aria-selected': String(Boolean(tab.active)),
    }, tab.label)),
  );
}

export function moduleCompactTable(options: { headers: string[]; rows: DomChild[][]; label: string }): HTMLElement {
  return h('div', { className: 'module-table-wrap' },
    h('table', { className: 'module-table', 'aria-label': options.label },
      h('thead', null, h('tr', null, ...options.headers.map((header) => h('th', { scope: 'col' }, header)))),
      h('tbody', null, ...options.rows.map((row) => h('tr', null, ...row.map((cell) => h('td', null, cell))))),
    ),
  );
}

export function moduleEventRow(options: {
  title: string;
  source?: string;
  timestamp?: string;
  summary?: string;
  severity?: { label: string; tone: Exclude<ModuleTone, 'neutral' | 'unavailable'> };
  actions?: DomChild[];
}): HTMLElement {
  return h('article', { className: 'module-event-row' },
    h('div', { className: 'module-event-main' },
      h('div', { className: 'module-event-heading' },
        options.severity ? moduleSeverity(options.severity.label, options.severity.tone) : null,
        h('span', { className: 'module-event-title' }, options.title),
      ),
      options.summary ? h('p', { className: 'module-event-summary' }, options.summary) : null,
      options.source || options.timestamp ? moduleMeta([
        ...(options.source ? [{ value: options.source, kind: 'source' as const }] : []),
        ...(options.timestamp ? [{ value: options.timestamp, kind: 'timestamp' as const }] : []),
      ]) : null,
    ),
    options.actions?.length ? h('div', { className: 'module-context-actions' }, ...options.actions) : null,
  );
}

export function moduleStatusRow(options: {
  label: string;
  value: string;
  tone?: ModuleTone;
  detail?: string;
}): HTMLElement {
  return h('div', { className: 'module-status-row' },
    h('span', { className: 'module-status-label' }, options.label),
    h('span', { className: `module-status-value ${toneClass(options.tone ?? 'neutral')}` }, options.value),
    options.detail ? h('span', { className: 'module-status-detail' }, options.detail) : null,
  );
}
