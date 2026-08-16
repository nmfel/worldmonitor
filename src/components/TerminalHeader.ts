export interface TerminalHeaderOptions {
  workspaceName: string;
  variant: string;
  isDesktopApp: boolean;
  labels: {
    search: string;
    fullscreen: string;
    selectRegion: string;
    regions: ReadonlyArray<readonly [value: string, label: string]>;
  };
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class TerminalHeader {
  private readonly root = element('header', 'header terminal-header');
  private readonly title = element('strong', 'terminal-header-title');

  constructor(options: TerminalHeaderOptions) {
    this.root.setAttribute('aria-label', 'Workspace controls');
    this.build(options);
  }

  public getElement(): HTMLElement {
    return this.root;
  }

  public setWorkspaceName(name: string): void {
    this.title.textContent = name;
    this.title.title = name;
  }

  public destroy(): void {
    this.root.remove();
  }

  private build(options: TerminalHeaderOptions): void {
    const left = element('div', 'header-left terminal-header-context');
    const context = element('div', 'terminal-header-context-copy');
    const eyebrow = element('span', 'terminal-header-eyebrow', 'Workspace');
    this.setWorkspaceName(options.workspaceName);
    context.append(eyebrow, this.title);

    const region = element('select', 'region-select terminal-region-select');
    region.id = 'regionSelect';
    region.setAttribute('aria-label', options.labels.selectRegion);
    for (const [value, label] of options.labels.regions) {
      const option = element('option', '', label);
      option.value = value;
      region.appendChild(option);
    }

    const missionMount = element('span', 'mission-preset-mount terminal-mission-mount');
    missionMount.id = 'missionPresetMount';
    left.append(context, region, missionMount);

    const center = element('div', 'terminal-header-command');
    const search = element('button', 'search-btn terminal-search-btn');
    search.id = 'searchBtn';
    search.type = 'button';
    search.setAttribute('aria-label', options.labels.search);
    search.append(
      element('span', 'terminal-search-icon', '⌕'),
      element('span', 'terminal-search-label', options.labels.search),
      element('kbd', 'terminal-search-shortcut', '⌘K'),
    );
    center.appendChild(search);

    const right = element('div', 'header-right terminal-header-utilities');
    if (!options.isDesktopApp) {
      const fullscreen = element('button', 'fullscreen-btn terminal-icon-btn', '⛶');
      fullscreen.id = 'fullscreenBtn';
      fullscreen.type = 'button';
      fullscreen.title = options.labels.fullscreen;
      fullscreen.setAttribute('aria-label', options.labels.fullscreen);
      right.appendChild(fullscreen);
    }
    if (options.variant === 'happy') {
      const tvMode = element('button', 'tv-mode-btn terminal-icon-btn', 'TV');
      tvMode.id = 'tvModeBtn';
      tvMode.type = 'button';
      tvMode.title = 'TV Mode (Shift+T)';
      right.appendChild(tvMode);
    }

    const settingsMount = element('span', 'terminal-settings-mount');
    settingsMount.id = 'unifiedSettingsMount';
    const authMount = element('span', 'auth-widget-mount terminal-auth-mount');
    authMount.id = 'authWidgetMount';
    right.append(settingsMount, authMount);

    this.root.append(left, center, right);
  }
}
