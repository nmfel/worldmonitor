import { getModule } from '@/config/module-registry';
import type { PanelConfig } from '@/types';
import { WorkspaceStore, type PanelPlacement, type Workspace } from './workspace-store';

export class ActiveWorkspaceLayoutController {
  private applying = false;

  constructor(
    private readonly store: WorkspaceStore,
    private readonly enabled: () => boolean,
  ) {}

  public runApplying<T>(apply: () => T): T {
    this.applying = true;
    try {
      return apply();
    } finally {
      this.applying = false;
    }
  }

  public setSpan(moduleId: string, field: 'rowSpan' | 'colSpan', value?: number): boolean {
    return this.patchExisting(moduleId, (placement) => {
      if (value === undefined) delete placement[field];
      else placement[field] = value;
    });
  }

  public setCollapsed(moduleId: string, collapsed: boolean): boolean {
    return this.patchExisting(moduleId, (placement) => { placement.collapsed = collapsed; });
  }

  public setEnabled(moduleId: string, enabled: boolean, config?: PanelConfig): boolean {
    if (!this.canWrite() || !getModule(moduleId)) return false;
    return this.store.updateActiveWorkspace((workspace) => {
      const placements = workspace.placements.map((placement) => ({ ...placement }));
      let placement = placements.find((candidate) => candidate.moduleId === moduleId);
      if (!placement) {
        if (!enabled) return workspace;
        placement = {
          instanceId: `placement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          moduleId,
          enabled: true,
          zone: 'main',
          order: placements.length,
        };
        placements.push(placement);
      }
      placement.enabled = enabled;
      if (typeof config?.fontScale === 'number') placement.fontScale = config.fontScale;
      else delete placement.fontScale;
      return { ...workspace, placements };
    });
  }

  public syncSettings(settings: Record<string, PanelConfig>): boolean {
    if (!this.canWrite()) return false;
    return this.store.updateActiveWorkspace((workspace) => ({
      ...workspace,
      placements: workspace.placements.map((placement) => {
        const config = settings[placement.moduleId];
        if (!config || !getModule(placement.moduleId)) return { ...placement };
        const next = { ...placement, enabled: config.enabled };
        if (typeof config.fontScale === 'number') next.fontScale = config.fontScale;
        else delete next.fontScale;
        return next;
      }),
    }));
  }

  public replaceOrder(order: readonly string[], bottomSet: ReadonlySet<string>): boolean {
    if (!this.canWrite()) return false;
    return this.store.updateActiveWorkspace((workspace) => {
      const rank = new Map(order.map((moduleId, index) => [moduleId, index]));
      const placements = workspace.placements.map((placement, originalIndex) => ({
        ...placement,
        zone: bottomSet.has(placement.moduleId) ? 'bottom' as const : 'main' as const,
        sortOrder: rank.get(placement.moduleId) ?? order.length + originalIndex,
      }))
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(({ sortOrder: _sortOrder, ...placement }, index) => ({ ...placement, order: index }));
      return { ...workspace, placements };
    });
  }

  public getActiveWorkspace(): Workspace | null {
    const id = this.store.getActiveWorkspaceId();
    return id ? this.store.getWorkspace(id) : null;
  }

  private patchExisting(moduleId: string, patch: (placement: PanelPlacement) => void): boolean {
    if (!this.canWrite() || !getModule(moduleId)) return false;
    return this.store.updateActiveWorkspace((workspace) => {
      const placements = workspace.placements.map((placement) => ({ ...placement }));
      const placement = placements.find((candidate) => candidate.moduleId === moduleId);
      if (!placement) return workspace;
      patch(placement);
      return { ...workspace, placements };
    });
  }

  private canWrite(): boolean {
    return this.enabled() && !this.applying;
  }
}
