import {
  ALL_PANELS,
  getEffectivePanelConfig,
  PANEL_CATEGORY_MAP,
  VARIANT_DEFAULTS,
} from './panels';

export const MODULE_CATEGORIES = [
  'Intelligence',
  'News',
  'Markets',
  'Macro',
  'Energy',
  'Geopolitics',
  'Security',
  'Aviation',
  'Infrastructure',
  'Technology',
  'Personal',
  'Utilities',
] as const;

export type ModuleCategory = typeof MODULE_CATEGORIES[number];
export type ModuleCapability = 'hide' | 'reorder' | 'resize';

export interface ModuleMeta {
  readonly id: string;
  readonly title: string;
  readonly category: ModuleCategory;
  readonly capabilities: readonly ModuleCapability[];
  readonly singleton: true;
  readonly premium?: 'locked' | 'enhanced';
  readonly proGated: boolean;
  readonly variants: readonly string[];
  readonly defaultEnabledVariants: readonly string[];
}

const CATEGORY_KEYS: Readonly<Record<ModuleCategory, readonly string[]>> = {
  Intelligence: ['intelligence', 'correlation'],
  News: ['regionalNews', 'topical', 'happyNews'],
  Markets: ['finMarkets', 'finCommodities', 'cryptoDigital', 'dealsInstitutional', 'techMarkets', 'commodityPrices'],
  Macro: ['fixedIncomeFx', 'centralBanksEcon', 'commodityEcon'],
  Energy: ['marketsFinance'],
  Geopolitics: ['gulfMena', 'happyPlanet'],
  Security: ['securityPolicy'],
  Aviation: [],
  Infrastructure: ['dataTracking'],
  Technology: ['techAi', 'startupsVc', 'miningIndustry'],
  Personal: [],
  Utilities: ['core'],
};

const CATEGORY_OVERRIDES: Readonly<Partial<Record<string, ModuleCategory>>> = {
  map: 'Geopolitics',
  insights: 'Intelligence',
  'strategic-posture': 'Intelligence',
  'latest-brief': 'Intelligence',
  monitors: 'Personal',
  'world-clock': 'Utilities',
  'live-news': 'News',
  'live-webcams': 'Utilities',
  'windy-webcams': 'Utilities',
  'airline-intel': 'Aviation',
  commodities: 'Markets',
  markets: 'Markets',
  heatmap: 'Markets',
  crypto: 'Markets',
  economic: 'Macro',
  'macro-signals': 'Macro',
  'energy-complex': 'Energy',
  'energy-risk-overview': 'Energy',
  'pipeline-status': 'Energy',
  'storage-facility-map': 'Energy',
  'oil-inventories': 'Energy',
  'fuel-prices': 'Energy',
  'chokepoint-strip': 'Energy',
  'fuel-shortages': 'Energy',
  'energy-disruptions': 'Energy',
  'hormuz-tracker': 'Energy',
  'energy-crisis': 'Energy',
  renewable: 'Energy',
  'supply-chain': 'Infrastructure',
  'china-corridors': 'Infrastructure',
  'global-procurement': 'Infrastructure',
  'internet-disruptions': 'Infrastructure',
  'service-status': 'Utilities',
  'satellite-fires': 'Security',
  'ucdp-events': 'Security',
  'oref-sirens': 'Security',
  'radiation-watch': 'Security',
  'security-advisories': 'Security',
  'disease-outbreaks': 'Security',
  'defense-patents': 'Technology',
  'tech-readiness': 'Technology',
  events: 'Technology',
  'ai-regulation': 'Technology',
};

const CATEGORY_BY_PANEL = new Map<string, ModuleCategory>();
for (const category of MODULE_CATEGORIES) {
  for (const categoryKey of CATEGORY_KEYS[category]) {
    for (const panelId of PANEL_CATEGORY_MAP[categoryKey]?.panelKeys ?? []) {
      if (!CATEGORY_BY_PANEL.has(panelId)) CATEGORY_BY_PANEL.set(panelId, category);
    }
  }
}
for (const [panelId, category] of Object.entries(CATEGORY_OVERRIDES)) {
  if (category) CATEGORY_BY_PANEL.set(panelId, category);
}

function variantsForPanel(id: string): string[] {
  return Object.entries(VARIANT_DEFAULTS)
    .filter(([, panelIds]) => panelIds.includes(id))
    .map(([variant]) => variant);
}

function defaultEnabledVariantsForPanel(id: string, variants: readonly string[]): string[] {
  return variants.filter((variant) => getEffectivePanelConfig(id, variant).enabled);
}

function buildModule(id: string): ModuleMeta {
  const variants = variantsForPanel(id);
  const config = ALL_PANELS[id]!;
  const capabilities: readonly ModuleCapability[] = id === 'map'
    ? Object.freeze(['hide', 'resize'] satisfies ModuleCapability[])
    : Object.freeze(['hide', 'reorder', 'resize'] satisfies ModuleCapability[]);
  return Object.freeze({
    id,
    title: config.name,
    category: CATEGORY_BY_PANEL.get(id) ?? 'Utilities',
    capabilities,
    singleton: true,
    premium: config.premium,
    proGated: config.proGated === true,
    variants: Object.freeze(variants),
    defaultEnabledVariants: Object.freeze(defaultEnabledVariantsForPanel(id, variants)),
  });
}

const MODULES = Object.freeze(Object.keys(ALL_PANELS).map(buildModule));
const MODULES_BY_ID = new Map(MODULES.map((module) => [module.id, module]));

export function getModule(id: string): ModuleMeta | undefined {
  return MODULES_BY_ID.get(id);
}

export function listModules(): readonly ModuleMeta[] {
  return MODULES;
}

export function listModulesByCategory(category?: ModuleCategory): ReadonlyMap<ModuleCategory, readonly ModuleMeta[]> | readonly ModuleMeta[] {
  if (category) return MODULES.filter((module) => module.category === category);
  return new Map(MODULE_CATEGORIES.map((moduleCategory) => [
    moduleCategory,
    Object.freeze(MODULES.filter((module) => module.category === moduleCategory)),
  ]));
}

export function listModulesForVariant(variant: string): readonly ModuleMeta[] {
  return MODULES.filter((module) => module.variants.includes(variant));
}

export function getModuleForVariant(id: string, variant: string): ModuleMeta | undefined {
  const module = getModule(id);
  if (!module || !module.variants.includes(variant)) return undefined;
  const config = getEffectivePanelConfig(id, variant);
  return Object.freeze({
    ...module,
    title: config.name,
    premium: config.premium,
    proGated: config.proGated === true,
  });
}
