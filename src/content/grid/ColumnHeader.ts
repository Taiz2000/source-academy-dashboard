import type { IHeaderComp, IHeaderParams } from 'ag-grid-community';

import { bp } from '../blueprint';
import { iconHtml } from '../icons';

const SORT_ICON = { asc: 'sort-asc', desc: 'sort-desc' } as const;

/**
 * SA's grading table header (frontend commons/agGrid/ColumnHeader.tsx + GradingSortIcon.tsx), with
 * the same Tailwind classes: the label, then a sort button revealed on hover. Unlike SA, the button
 * stays visible while the column is sorted, and clicking the label sorts too (shift adds a column).
 */
export class ColumnHeader implements IHeaderComp {
  private gui!: HTMLDivElement;
  private button: HTMLButtonElement | null = null;
  private params!: IHeaderParams;
  private onSortChanged = () => this.renderSort();

  init(params: IHeaderParams) {
    this.params = params;
    this.gui = document.createElement('div');
    this.gui.className = 'group flex h-full w-full items-center';

    const label = document.createElement('span');
    label.className = 'ag-header-cell-text w-full truncate text-left';
    label.textContent = params.displayName;
    this.gui.append(label);

    if (params.enableSorting) {
      const actions = document.createElement('div');
      actions.className =
        'sad-header-actions w-0 group-hover:w-fit group-focus-within:w-fit pointer-events-none flex items-center gap-0.5 opacity-0 transition-opacity group-hover:pointer-events-auto group-focus-within:pointer-events-auto group-hover:opacity-100 group-focus-within:opacity-100';
      this.button = document.createElement('button');
      this.button.type = 'button';
      this.button.className = `${bp('button', 'minimal')} flex cursor-pointer rounded p-1.5 hover:bg-black/10`;
      this.button.setAttribute('aria-label', `Sort by ${params.displayName}`);
      actions.append(this.button);
      this.gui.append(actions);

      this.gui.style.cursor = 'pointer';
      this.gui.addEventListener('click', e => params.progressSort(e.shiftKey));
      params.column.addEventListener('sortChanged', this.onSortChanged);
      this.renderSort();
    }
  }

  private renderSort() {
    if (!this.button) return;
    const sort = this.params.column.getSort();
    const name = this.params.displayName;
    this.gui.classList.toggle('sad-sorted', !!sort);
    this.button.innerHTML = iconHtml(sort ? SORT_ICON[sort] : 'sort');
    this.button.title = sort
      ? `Sorted by ${name} (${sort === 'asc' ? 'Ascending' : 'Descending'})`
      : `Click to sort by ${name}`;
  }

  getGui() {
    return this.gui;
  }

  refresh(params: IHeaderParams) {
    this.params = params;
    this.renderSort();
    return true;
  }

  destroy() {
    this.params.column.removeEventListener('sortChanged', this.onSortChanged);
  }
}
