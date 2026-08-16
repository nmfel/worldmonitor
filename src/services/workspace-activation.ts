import type { PanelConfig } from '@/types';
import { getModule } from '@/config/module-registry';
import type { PanelPlacement, Workspace } from './workspace-store';

export interface WorkspaceActivationResult {
  panelSettings: Record<string, PanelConfig>;
  panelOrder: string[];
  bottomSet: string[];
  placements: ReadonlyMap<string, PanelPlacement>;
}

export function buildActivationState(
  workspace: Workspace,
  currentSettings: Record<string, PanelConfig>,
): WorkspaceActivationResult {
  const placements = new Map<string, PanelPlacement>();
  const candidates: unknown[] = Array.isArray(workspace.placements) ? workspace.placements : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    const placement = candidate as Partial<PanelPlacement>;
    if (typeof placement.moduleId !== 'string'
      || typeof placement.instanceId !== 'string'
      || typeof placement.enabled !== 'boolean'
      || (placement.zone !== 'main' && placement.zone !== 'bottom')
      || typeof placement.order !== 'number'
      || !Number.isFinite(placement.order)
      || !getModule(placement.moduleId)
      || !currentSettings[placement.moduleId]) continue;
    placements.set(placement.moduleId, placement as PanelPlacement);
  }

  const panelSettings: Record<string, PanelConfig> = {};
  for (const [key, config] of Object.entries(currentSettings)) {
    const placement = placements.get(key);
    const fontScale = placement?.fontScale;
    const validFontScale = fontScale === 0.9
      || fontScale === 1
      || fontScale === 1.1
      || fontScale === 1.25
      || fontScale === 1.5
      || fontScale === 2
      ? fontScale
      : config.fontScale;
    panelSettings[key] = {
      ...config,
      enabled: placement?.enabled ?? false,
      fontScale: validFontScale,
      proGated: placement?.proGated ?? config.proGated,
    };
  }

  const orderedPlacements = [...placements.values()].sort((a, b) => a.order - b.order);
  return {
    panelSettings,
    panelOrder: orderedPlacements.map((placement) => placement.moduleId),
    bottomSet: orderedPlacements
      .filter((placement) => placement.zone === 'bottom')
      .map((placement) => placement.moduleId),
    placements,
  };
}

export function getChangedModuleIds(
  before: Record<string, PanelConfig>,
  after: Record<string, PanelConfig>,
): string[] {
  return Object.keys(before).filter((key) => before[key]?.enabled !== after[key]?.enabled
    || before[key]?.fontScale !== after[key]?.fontScale
    || before[key]?.proGated !== after[key]?.proGated);
}

export function isWorkspaceModeEnabled(): boolean {
  try {
    return typeof import.meta.env !== 'undefined' && import.meta.env.VITE_WM_WORKSPACES === '1';
  } catch {
    return false;
  }
}
