import { useState } from 'preact/hooks';

import { bp } from './blueprint';
import { MinimalButton } from './panels/common';
import { HeatmapPanel } from './panels/HeatmapPanel';
import { SubmissionsPanel } from './panels/SubmissionsPanel';

const TABS = [
  { id: 'submissions', label: 'Submissions', Panel: SubmissionsPanel },
  { id: 'dashboard', label: 'Dashboard', Panel: HeatmapPanel },
] as const;

type TabId = (typeof TABS)[number]['id'];

// Reopening the overlay returns to the last tab used on this page.
let lastTab: TabId = 'submissions';

type Props = {
  courseId: number;
  onClose: () => void;
};

/**
 * Same structure and classes as SA's grading page (ContentDisplay → card → grading-table-wrapper),
 * so SA's own stylesheet gives us its card, margins and padding.
 */
export function Overlay({ courseId, onClose }: Props) {
  const [tab, setTab] = useState<TabId>(lastTab);
  const { Panel } = TABS.find(t => t.id === tab)!;

  return (
    <div class="ContentDisplay row center-xs">
      <div class="col-md-12 contentdisplay-content-parent">
        <div class={`${bp('card', 'elevation-3')} contentdisplay-content`}>
          <div class="grading-table-wrapper sad-root">
            <div class="sad-header">
              <div class={bp('tabs')}>
                <div class={bp('tab-list')} role="tablist">
                  {TABS.map(t => (
                    <div
                      key={t.id}
                      class={bp('tab')}
                      role="tab"
                      tabIndex={0}
                      aria-selected={t.id === tab}
                      onClick={() => {
                        lastTab = t.id;
                        setTab(t.id);
                      }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              </div>
              <MinimalButton onClick={onClose} title="Back to Source Academy" icon="cross">
                Close
              </MinimalButton>
            </div>

            <Panel courseId={courseId} />
          </div>
        </div>
      </div>
    </div>
  );
}
