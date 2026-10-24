import { useState } from 'preact/hooks';

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

export function Overlay({ courseId, onClose }: Props) {
  const [tab, setTab] = useState<TabId>(lastTab);
  const { Panel } = TABS.find(t => t.id === tab)!;

  return (
    <div class="panel">
      <header>
        <strong>Grading Dashboard</strong>
        <span class="muted">course {courseId}</span>
        <nav class="tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              onClick={() => {
                lastTab = t.id;
                setTab(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <span class="spacer" />
        <button onClick={onClose}>Close</button>
      </header>

      <Panel courseId={courseId} />
    </div>
  );
}
