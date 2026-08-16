import type { PanelConfig } from '@/types';
import { SITE_VARIANT } from '@/config/variant';

export interface PanelPlacement {
  instanceId: string;
  moduleId: string;
  enabled: boolean;
  zone: 'main' | 'bottom';
  order: number;
  rowSpan?: number;
  colSpan?: number;
  collapsed?: boolean;
  fontScale?: number;
  proGated?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  variant: string;
  placements: PanelPlacement[];
  created: number;
  updated: number;
}

export interface WorkspaceStoreState {
  version: 1;
  activeWorkspaceId: string;
  workspaces: Workspace[];
}

interface LegacyTab {
  id: string;
  name: string;
  panelSettings: Record<string, PanelConfig>;
  panelOrder: string[];
  bottomSet: string[];
}

function generateWorkspaceId(): string {
  return `workspace-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function readRecord<T>(storage: Storage, key: string): Record<string, T> {
  try {
    const raw = storage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed as Record<string, T> : {};
  } catch {
    return {};
  }
}

function readStringArray(storage: Storage, key: string): string[] {
  try {
    const raw = storage.getItem(key);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return isStringArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export class WorkspaceStore {
  private readonly variant: string;
  private readonly storage: Storage | null;
  private readonly listKey: string;
  private readonly activeKey: string;

  constructor(variant = SITE_VARIANT, storage = typeof window !== 'undefined' ? window.localStorage : null) {
    this.variant = variant;
    this.storage = storage;
    this.listKey = `wm-workspaces-v1:${variant}`;
    this.activeKey = `wm-active-workspace:${variant}`;
  }

  public getListKey(): string {
    return this.listKey;
  }

  public getActiveKey(): string {
    return this.activeKey;
  }

  public loadState(): WorkspaceStoreState | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.listKey);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.workspaces)) return null;

      const workspaces = parsed.workspaces
        .map((workspace) => this.validateWorkspace(workspace))
        .filter((workspace): workspace is Workspace => workspace !== null);
      if (workspaces.length === 0) return null;

      const storedActive = this.storage.getItem(this.activeKey);
      const stateActive = typeof parsed.activeWorkspaceId === 'string' ? parsed.activeWorkspaceId : null;
      const activeWorkspaceId = [storedActive, stateActive]
        .find((id) => id !== null && workspaces.some((workspace) => workspace.id === id))
        ?? workspaces[0]!.id;

      return { version: 1, activeWorkspaceId, workspaces };
    } catch {
      return null;
    }
  }

  public saveState(state: WorkspaceStoreState): void {
    if (!this.storage) return;
    const normalized = this.validateState(state);
    if (!normalized) return;
    try {
      this.storage.setItem(this.listKey, JSON.stringify(normalized));
      this.storage.setItem(this.activeKey, normalized.activeWorkspaceId);
    } catch {
      return;
    }
  }

  public createWorkspace(name: string, placements: PanelPlacement[] = []): Workspace {
    const timestamp = Date.now();
    const workspace: Workspace = {
      id: generateWorkspaceId(),
      name: name.trim() || 'New Workspace',
      variant: this.variant,
      placements: this.validatePlacements(placements),
      created: timestamp,
      updated: timestamp,
    };
    const current = this.loadState();
    this.saveState(current
      ? { ...current, activeWorkspaceId: workspace.id, workspaces: [...current.workspaces, workspace] }
      : { version: 1, activeWorkspaceId: workspace.id, workspaces: [workspace] });
    return workspace;
  }

  public getWorkspace(id: string): Workspace | null {
    return this.loadState()?.workspaces.find((workspace) => workspace.id === id) ?? null;
  }

  public listWorkspaces(): Workspace[] {
    return this.loadState()?.workspaces ?? [];
  }

  public updateWorkspace(workspace: Workspace): boolean {
    const current = this.loadState();
    const validated = this.validateWorkspace(workspace);
    if (!current || !validated) return false;
    const index = current.workspaces.findIndex((candidate) => candidate.id === validated.id);
    if (index === -1) return false;
    const existing = current.workspaces[index]!;
    current.workspaces[index] = { ...validated, created: existing.created, updated: Date.now() };
    this.saveState(current);
    return true;
  }

  public renameWorkspace(id: string, name: string): boolean {
    const workspace = this.getWorkspace(id);
    if (!workspace) return false;
    workspace.name = name.trim() || 'Untitled Workspace';
    return this.updateWorkspace(workspace);
  }

  public duplicateWorkspace(id: string, name?: string): Workspace | null {
    const source = this.getWorkspace(id);
    const current = this.loadState();
    if (!source || !current) return null;
    const timestamp = Date.now();
    const duplicate: Workspace = {
      ...source,
      id: generateWorkspaceId(),
      name: name?.trim() || `${source.name} Copy`,
      placements: source.placements.map((placement) => ({ ...placement, instanceId: generateWorkspaceId() })),
      created: timestamp,
      updated: timestamp,
    };
    this.saveState({
      ...current,
      activeWorkspaceId: duplicate.id,
      workspaces: [...current.workspaces, duplicate],
    });
    return duplicate;
  }

  public deleteWorkspace(id: string): boolean {
    const current = this.loadState();
    if (!current || !current.workspaces.some((workspace) => workspace.id === id)) return false;
    const workspaces = current.workspaces.filter((workspace) => workspace.id !== id);
    if (workspaces.length === 0) {
      try {
        this.storage?.removeItem(this.listKey);
        this.storage?.removeItem(this.activeKey);
      } catch {
        return false;
      }
      return true;
    }
    this.saveState({
      ...current,
      activeWorkspaceId: current.activeWorkspaceId === id ? workspaces[0]!.id : current.activeWorkspaceId,
      workspaces,
    });
    return true;
  }

  public getActiveWorkspaceId(): string | null {
    return this.loadState()?.activeWorkspaceId ?? null;
  }

  public setActiveWorkspaceId(id: string): boolean {
    const state = this.loadState();
    if (!state || !state.workspaces.some((workspace) => workspace.id === id)) return false;
    this.saveState({ ...state, activeWorkspaceId: id });
    return true;
  }

  public migrateFromLegacy(
    panelSettingsKey = 'worldmonitor-panels',
    panelOrderKey = 'panel-order',
    tabsKey = `worldmonitor-tabs-v1:${this.variant}`,
  ): boolean {
    if (!this.storage || this.loadState()) return false;
    const tabs = this.readLegacyTabs(tabsKey);
    if (tabs) {
      const workspaces = tabs.tabs.map((tab) => this.workspaceFromLegacyTab(tab));
      const activeIndex = tabs.tabs.findIndex((tab) => tab.id === tabs.activeTabId);
      const activeWorkspaceId = workspaces[Math.max(activeIndex, 0)]?.id ?? workspaces[0]!.id;
      this.saveState({ version: 1, activeWorkspaceId, workspaces });
      return this.loadState() !== null;
    }

    const settings = readRecord<PanelConfig>(this.storage, panelSettingsKey);
    const order = readStringArray(this.storage, panelOrderKey);
    if (Object.keys(settings).length === 0 && order.length === 0) return false;
    this.createWorkspace(
      'Default Workspace',
      this.buildPlacementsFromLegacy(settings, order, readStringArray(this.storage, `${panelOrderKey}-bottom-set`)),
    );
    return this.loadState() !== null;
  }

  private readLegacyTabs(key: string): { activeTabId: string; tabs: LegacyTab[] } | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!isRecord(parsed) || typeof parsed.activeTabId !== 'string' || !Array.isArray(parsed.tabs)) return null;
      const tabs = parsed.tabs.filter((tab): tab is LegacyTab => this.isLegacyTab(tab));
      return tabs.length > 0 ? { activeTabId: parsed.activeTabId, tabs } : null;
    } catch {
      return null;
    }
  }

  private isLegacyTab(value: unknown): value is LegacyTab {
    return isRecord(value)
      && typeof value.id === 'string'
      && typeof value.name === 'string'
      && isRecord(value.panelSettings)
      && isStringArray(value.panelOrder)
      && isStringArray(value.bottomSet);
  }

  private workspaceFromLegacyTab(tab: LegacyTab): Workspace {
    const timestamp = Date.now();
    return {
      id: generateWorkspaceId(),
      name: tab.name.trim() || 'Workspace',
      variant: this.variant,
      placements: this.buildPlacementsFromLegacy(tab.panelSettings, tab.panelOrder, tab.bottomSet),
      created: timestamp,
      updated: timestamp,
    };
  }

  private buildPlacementsFromLegacy(
    settings: Record<string, PanelConfig>,
    order: string[],
    bottomSet: string[],
  ): PanelPlacement[] {
    if (!this.storage) return [];
    const spans = readRecord<number>(this.storage, 'worldmonitor-panel-spans');
    const colSpans = readRecord<number>(this.storage, 'worldmonitor-panel-col-spans');
    const collapsed = readRecord<boolean>(this.storage, 'worldmonitor-panel-collapsed');
    const bottom = new Set(bottomSet);
    const moduleIds = [...new Set([...order, ...Object.keys(settings)])];

    return moduleIds.map((moduleId, index) => {
      const config = settings[moduleId];
      const placement: PanelPlacement = {
        instanceId: generateWorkspaceId(),
        moduleId,
        enabled: config?.enabled ?? false,
        zone: bottom.has(moduleId) ? 'bottom' : 'main',
        order: index,
      };
      if (typeof spans[moduleId] === 'number') placement.rowSpan = spans[moduleId];
      if (typeof colSpans[moduleId] === 'number') placement.colSpan = colSpans[moduleId];
      if (typeof collapsed[moduleId] === 'boolean') placement.collapsed = collapsed[moduleId];
      if (typeof config?.fontScale === 'number') placement.fontScale = config.fontScale;
      if (typeof config?.proGated === 'boolean') placement.proGated = config.proGated;
      return placement;
    });
  }

  private validateState(value: unknown): WorkspaceStoreState | null {
    if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.workspaces)) return null;
    const workspaces = value.workspaces
      .map((workspace) => this.validateWorkspace(workspace))
      .filter((workspace): workspace is Workspace => workspace !== null);
    if (workspaces.length === 0) return null;
    const activeWorkspaceId = typeof value.activeWorkspaceId === 'string'
      && workspaces.some((workspace) => workspace.id === value.activeWorkspaceId)
      ? value.activeWorkspaceId
      : workspaces[0]!.id;
    return { version: 1, activeWorkspaceId, workspaces };
  }

  private validateWorkspace(value: unknown): Workspace | null {
    if (!isRecord(value)
      || typeof value.id !== 'string'
      || typeof value.name !== 'string'
      || value.variant !== this.variant
      || !Array.isArray(value.placements)) return null;
    return {
      id: value.id,
      name: value.name,
      variant: this.variant,
      placements: this.validatePlacements(value.placements),
      created: typeof value.created === 'number' && Number.isFinite(value.created) ? value.created : Date.now(),
      updated: typeof value.updated === 'number' && Number.isFinite(value.updated) ? value.updated : Date.now(),
    };
  }

  private validatePlacements(values: unknown[]): PanelPlacement[] {
    const placements: PanelPlacement[] = [];
    for (const value of values) {
      if (!isRecord(value)
        || typeof value.instanceId !== 'string'
        || typeof value.moduleId !== 'string'
        || typeof value.enabled !== 'boolean'
        || typeof value.order !== 'number'
        || !Number.isFinite(value.order)
        || (value.zone !== 'main' && value.zone !== 'bottom')) continue;
      const placement: PanelPlacement = {
        instanceId: value.instanceId,
        moduleId: value.moduleId,
        enabled: value.enabled,
        zone: value.zone,
        order: value.order,
      };
      if (typeof value.rowSpan === 'number' && Number.isFinite(value.rowSpan)) placement.rowSpan = value.rowSpan;
      if (typeof value.colSpan === 'number' && Number.isFinite(value.colSpan)) placement.colSpan = value.colSpan;
      if (typeof value.collapsed === 'boolean') placement.collapsed = value.collapsed;
      if (typeof value.fontScale === 'number' && Number.isFinite(value.fontScale)) placement.fontScale = value.fontScale;
      if (typeof value.proGated === 'boolean') placement.proGated = value.proGated;
      placements.push(placement);
    }
    return placements;
  }

  public updateActiveWorkspace(
    updater: (workspace: Workspace) => Workspace | null,
  ): boolean {
    if (!this.storage) return false;
    const state = this.loadState();
    if (!state) return false;
    const index = state.workspaces.findIndex((w) => w.id === state.activeWorkspaceId);
    if (index === -1) return false;
    const active = state.workspaces[index]!;
    const next = updater({ ...active, placements: [...active.placements] });
    if (!next) return false;
    const updated: Workspace = { ...next, created: active.created, updated: Date.now() };
    state.workspaces[index] = updated;
    this.saveState(state);
    return true;
  }
}
