import {
  getModuleForVariant,
  listModulesForVariant,
  MODULE_CATEGORIES,
  type ModuleCategory,
  type ModuleMeta,
} from '@/config/module-registry';
import { WorkspaceStore, type PanelPlacement, type Workspace } from '@/services/workspace-store';

export interface WorkspaceSidebarOptions {
  store: WorkspaceStore;
  variant: string;
  activate: (workspace: Workspace) => boolean;
  openSettings?: () => void;
  confirmDelete?: (workspace: Workspace) => Promise<boolean>;
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

export class WorkspaceSidebar {
  private readonly options: WorkspaceSidebarOptions;
  private readonly root = element('aside', 'workspace-sidebar');
  private readonly workspaceList = element('div', 'workspace-sidebar-list');
  private readonly library = element('div', 'workspace-library');
  private readonly libraryList = element('div', 'workspace-library-list');
  private readonly searchInput = element('input', 'workspace-library-search');
  private activeCategory: ModuleCategory | null = null;
  private collapsed = false;
  private activeWorkspaceId: string | null = null;

  constructor(options: WorkspaceSidebarOptions) {
    this.options = options;
    this.root.setAttribute('aria-label', 'Workspace navigation');
    this.build();
    this.refresh();
  }

  public getElement(): HTMLElement {
    return this.root;
  }

  public destroy(): void {
    this.root.remove();
    this.library.remove();
  }

  public refresh(): void {
    const state = this.options.store.loadState();
    this.activeWorkspaceId = state?.activeWorkspaceId ?? null;
    this.workspaceList.replaceChildren();
    for (const workspace of state?.workspaces ?? []) {
      this.workspaceList.appendChild(this.createWorkspaceRow(workspace, state?.workspaces.length ?? 0));
    }
    this.renderLibrary();
  }

  private build(): void {
    const product = element('div', 'workspace-sidebar-product');
    const mark = element('span', 'workspace-sidebar-mark', 'WM');
    mark.setAttribute('aria-hidden', 'true');
    const identity = element('div', 'workspace-sidebar-identity');
    identity.append(element('strong', '', 'WorldMonitor'), element('span', '', 'Intelligence Terminal'));
    const collapse = element('button', 'workspace-sidebar-collapse', '‹');
    collapse.type = 'button';
    collapse.setAttribute('aria-label', 'Collapse sidebar');
    collapse.addEventListener('click', () => this.setCollapsed(!this.collapsed));
    product.append(mark, identity, collapse);

    const workspaceSection = element('section', 'workspace-sidebar-section');
    const workspaceHeader = element('div', 'workspace-sidebar-section-header');
    workspaceHeader.append(element('span', '', 'Workspaces'));
    const create = element('button', 'workspace-sidebar-icon-btn', '+');
    create.type = 'button';
    create.setAttribute('aria-label', 'Create workspace');
    create.addEventListener('click', () => this.openNameEditor('Create workspace', '', (name) => {
      const workspace = this.options.store.createWorkspace(name, this.defaultPlacements());
      this.options.activate(workspace);
      this.refresh();
    }));
    workspaceHeader.appendChild(create);
    workspaceSection.append(workspaceHeader, this.workspaceList);

    const moduleSection = element('section', 'workspace-sidebar-section');
    const moduleHeader = element('div', 'workspace-sidebar-section-header');
    moduleHeader.appendChild(element('span', '', 'Modules'));
    const addModule = element('button', 'workspace-sidebar-action', '+ Add Module');
    addModule.type = 'button';
    addModule.addEventListener('click', () => this.openLibrary());
    moduleSection.append(moduleHeader, addModule);

    const utility = element('div', 'workspace-sidebar-utility');
    if (this.options.openSettings) {
      const settings = element('button', 'workspace-sidebar-action', 'Settings');
      settings.type = 'button';
      settings.addEventListener('click', this.options.openSettings);
      utility.appendChild(settings);
    }

    this.root.append(product, workspaceSection, moduleSection, utility);
    this.buildLibrary();
  }

  private createWorkspaceRow(workspace: Workspace, count: number): HTMLElement {
    const row = element('div', 'workspace-sidebar-row');
    row.dataset.workspaceId = workspace.id;
    if (workspace.id === this.activeWorkspaceId) row.classList.add('active');

    const select = element('button', 'workspace-sidebar-workspace', workspace.name);
    select.type = 'button';
    select.title = workspace.name;
    select.setAttribute('aria-current', workspace.id === this.activeWorkspaceId ? 'page' : 'false');
    select.addEventListener('click', () => {
      if (workspace.id === this.activeWorkspaceId) return;
      if (this.options.activate(workspace)) {
        this.options.store.setActiveWorkspaceId(workspace.id);
        this.refresh();
      }
    });

    const menu = element('button', 'workspace-sidebar-more', '•••');
    menu.type = 'button';
    menu.setAttribute('aria-label', `Workspace actions for ${workspace.name}`);
    menu.addEventListener('click', () => this.toggleWorkspaceActions(row, workspace, count));
    row.append(select, menu);
    return row;
  }

  private toggleWorkspaceActions(row: HTMLElement, workspace: Workspace, count: number): void {
    const existing = row.querySelector('.workspace-sidebar-row-actions');
    if (existing) {
      existing.remove();
      return;
    }
    this.root.querySelectorAll('.workspace-sidebar-row-actions').forEach((node) => node.remove());
    const actions = element('div', 'workspace-sidebar-row-actions');
    actions.append(
      this.actionButton('Rename', () => this.openNameEditor('Rename workspace', workspace.name, (name) => {
        this.options.store.renameWorkspace(workspace.id, name);
        this.refresh();
      })),
      this.actionButton('Duplicate', () => {
        const duplicate = this.options.store.duplicateWorkspace(workspace.id);
        if (duplicate) this.options.activate(duplicate);
        this.refresh();
      }),
    );
    const remove = this.actionButton('Delete', () => void this.deleteWorkspace(workspace));
    remove.classList.add('danger');
    remove.disabled = count <= 1;
    actions.appendChild(remove);
    row.appendChild(actions);
  }

  private actionButton(label: string, action: () => void): HTMLButtonElement {
    const button = element('button', 'workspace-sidebar-row-action', label);
    button.type = 'button';
    button.addEventListener('click', action);
    return button;
  }

  private async deleteWorkspace(workspace: Workspace): Promise<void> {
    const state = this.options.store.loadState();
    if (!state || state.workspaces.length <= 1) return;
    let confirmed = false;
    if (this.options.confirmDelete) {
      confirmed = await this.options.confirmDelete(workspace);
    } else {
      const { confirmDialog } = await import('@/components/confirm-dialog');
      confirmed = await confirmDialog({
        message: `Delete workspace “${workspace.name}”?`,
        confirmLabel: 'Delete',
      });
    }
    if (!confirmed) return;
    const wasActive = state.activeWorkspaceId === workspace.id;
    if (!this.options.store.deleteWorkspace(workspace.id)) return;
    if (wasActive) {
      const nextId = this.options.store.getActiveWorkspaceId();
      const next = nextId ? this.options.store.getWorkspace(nextId) : null;
      if (next) this.options.activate(next);
    }
    this.refresh();
  }

  private defaultPlacements(): PanelPlacement[] {
    const map = getModuleForVariant('map', this.options.variant);
    if (!map) return [];
    return [{
      instanceId: `placement-${Date.now().toString(36)}`,
      moduleId: 'map',
      enabled: true,
      zone: 'main',
      order: 0,
    }];
  }

  private setCollapsed(collapsed: boolean): void {
    this.collapsed = collapsed;
    this.root.classList.toggle('collapsed', collapsed);
    document.documentElement.classList.toggle('wm-workspace-sidebar-collapsed', collapsed);
    this.root.querySelector('.workspace-sidebar-collapse')?.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    const button = this.root.querySelector('.workspace-sidebar-collapse');
    if (button) button.textContent = collapsed ? '›' : '‹';
  }

  private buildLibrary(): void {
    this.library.setAttribute('role', 'dialog');
    this.library.setAttribute('aria-modal', 'true');
    this.library.setAttribute('aria-labelledby', 'workspace-library-title');
    const backdrop = element('button', 'workspace-library-backdrop');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close module library');
    backdrop.addEventListener('click', () => this.closeLibrary());

    const surface = element('section', 'workspace-library-surface');
    const header = element('header', 'workspace-library-header');
    const titleGroup = element('div');
    const title = element('h2', '', 'Add Module');
    title.id = 'workspace-library-title';
    titleGroup.append(title, element('p', '', 'Available capabilities for this workspace'));
    const close = element('button', 'workspace-sidebar-icon-btn', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close module library');
    close.addEventListener('click', () => this.closeLibrary());
    header.append(titleGroup, close);

    this.searchInput.type = 'search';
    this.searchInput.placeholder = 'Search modules';
    this.searchInput.setAttribute('aria-label', 'Search modules');
    this.searchInput.addEventListener('input', () => this.renderLibrary());

    const categories = element('div', 'workspace-library-categories');
    const all = this.categoryButton('All', null);
    all.classList.add('active');
    categories.appendChild(all);
    for (const category of MODULE_CATEGORIES) categories.appendChild(this.categoryButton(category, category));

    surface.append(header, this.searchInput, categories, this.libraryList);
    this.library.append(backdrop, surface);
    this.library.hidden = true;
    document.body.appendChild(this.library);
  }

  private categoryButton(label: string, category: ModuleCategory | null): HTMLButtonElement {
    const button = element('button', 'workspace-library-category', label);
    button.type = 'button';
    button.dataset.category = category ?? '';
    button.addEventListener('click', () => {
      this.activeCategory = category;
      this.library.querySelectorAll('.workspace-library-category').forEach((node) => {
        node.classList.toggle('active', (node as HTMLElement).dataset.category === (category ?? ''));
      });
      this.renderLibrary();
    });
    return button;
  }

  private openLibrary(): void {
    this.library.hidden = false;
    this.searchInput.focus();
    this.renderLibrary();
  }

  private closeLibrary(): void {
    this.library.hidden = true;
  }

  private renderLibrary(): void {
    if (!this.libraryList) return;
    const active = this.getActiveWorkspace();
    const added = new Set(active?.placements.map((placement) => placement.moduleId) ?? []);
    const query = (this.searchInput.value ?? '').trim().toLocaleLowerCase();
    const modules = listModulesForVariant(this.options.variant).filter((module) => {
      if (this.activeCategory && module.category !== this.activeCategory) return false;
      return !query || module.title.toLocaleLowerCase().includes(query) || module.category.toLocaleLowerCase().includes(query);
    });

    this.libraryList.replaceChildren();
    if (modules.length === 0) {
      this.libraryList.appendChild(element('div', 'workspace-library-empty', 'No modules match this search.'));
      return;
    }
    for (const module of modules) this.libraryList.appendChild(this.createModuleRow(module, added.has(module.id)));
  }

  private createModuleRow(module: ModuleMeta, added: boolean): HTMLElement {
    const row = element('article', 'workspace-library-module');
    row.dataset.moduleId = module.id;
    const copy = element('div', 'workspace-library-module-copy');
    const title = element('div', 'workspace-library-module-title', module.title);
    if (module.premium || module.proGated) title.appendChild(element('span', 'workspace-library-premium', 'PRO'));
    copy.append(title, element('span', 'workspace-library-module-category', module.category));
    const action = element('button', `workspace-library-module-action${added ? ' added' : ''}`, added ? 'Remove' : 'Add');
    action.type = 'button';
    action.disabled = module.id === 'map' && added;
    action.addEventListener('click', () => this.toggleModule(module.id, !added));
    row.append(copy, action);
    return row;
  }

  private toggleModule(moduleId: string, add: boolean): void {
    const workspace = this.getActiveWorkspace();
    if (!workspace) return;
    const existing = workspace.placements.find((placement) => placement.moduleId === moduleId);
    if (add && !existing) {
      const order = workspace.placements.reduce((maximum, placement) => Math.max(maximum, placement.order), -1) + 1;
      workspace.placements.push({
        instanceId: `placement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        moduleId,
        enabled: true,
        zone: 'main',
        order,
      });
    } else if (add && existing) {
      existing.enabled = true;
    } else if (!add && moduleId !== 'map') {
      workspace.placements = workspace.placements.filter((placement) => placement.moduleId !== moduleId);
    }
    if (!this.options.store.updateWorkspace(workspace)) return;
    this.options.activate(this.options.store.getWorkspace(workspace.id) ?? workspace);
    this.refresh();
  }

  private getActiveWorkspace(): Workspace | null {
    const id = this.options.store.getActiveWorkspaceId();
    return id ? this.options.store.getWorkspace(id) : null;
  }

  private openNameEditor(titleText: string, value: string, submit: (name: string) => void): void {
    const overlay = element('div', 'workspace-name-editor');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    const surface = element('form', 'workspace-name-editor-surface');
    const title = element('h2', '', titleText);
    const input = element('input');
    input.type = 'text';
    input.value = value;
    input.maxLength = 48;
    input.required = true;
    input.setAttribute('aria-label', 'Workspace name');
    const actions = element('div', 'workspace-name-editor-actions');
    const cancel = element('button', 'workspace-name-editor-cancel', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => overlay.remove());
    const save = element('button', 'workspace-name-editor-save', 'Save');
    save.type = 'submit';
    actions.append(cancel, save);
    surface.append(title, input, actions);
    surface.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) return;
      submit(name);
      overlay.remove();
    });
    overlay.appendChild(surface);
    document.body.appendChild(overlay);
    input.focus();
  }
}
