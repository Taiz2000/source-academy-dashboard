import type { IDoesFilterPassParams, IFilterComp, IFilterParams } from 'ag-grid-community';

import { emptyCounts, type Progress, type ProgressCounts, type Submission } from '../model';

export type ProgressFilterModel = { values: Progress[] } | null;

/**
 * Column filter for the Progress column, driven by the status chips above the table rather than a
 * menu. Being a column filter lets it count each status among the rows that pass every *other*
 * filter, so a status that is switched off still shows how many rows it would add back.
 */
export class ProgressFilter implements IFilterComp<Submission> {
  private params!: IFilterParams<Submission>;
  /** null: every status passes. */
  private selected: Set<Progress> | null = null;
  private gui = document.createElement('div');

  init(params: IFilterParams<Submission>) {
    this.params = params;
  }

  getGui() {
    return this.gui;
  }

  isFilterActive() {
    return this.selected !== null;
  }

  doesFilterPass({ data }: IDoesFilterPassParams<Submission>) {
    return !this.selected || this.selected.has(data.progress);
  }

  getModel(): ProgressFilterModel {
    return this.selected ? { values: [...this.selected] } : null;
  }

  setModel(model: ProgressFilterModel) {
    this.selected = model ? new Set(model.values) : null;
  }

  /** Rows per status among those passing the column filters other than this one. */
  countOtherRows(): ProgressCounts {
    const counts = emptyCounts();
    this.params.api.forEachNode(node => {
      if (node.data && this.params.doesRowPassOtherFilter(node)) counts[node.data.progress]++;
    });
    return counts;
  }
}
