import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { cachedDataBytes, clearCachedData } from '../cache';
import {
  DEFAULT_HIDDEN_GROUPS,
  groupKey,
  loadSeenGroups,
  saveSettings,
  type Settings,
} from '../settings';
import { useSettings } from '../useSettings';

type BooleanKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

function Toggle({ settings, name, label }: { settings: Settings; name: BooleanKey; label: string }) {
  return (
    <label class="toggle">
      <input
        type="checkbox"
        checked={settings[name]}
        onChange={e => saveSettings({ [name]: (e.target as HTMLInputElement).checked })}
      />
      {label}
    </label>
  );
}

function HiddenGroupsEditor({ settings }: { settings: Settings }) {
  const [draft, setDraft] = useState('');
  const [seenGroups, setSeenGroups] = useState<string[]>([]);
  useEffect(() => {
    loadSeenGroups().then(setSeenGroups);
  }, []);

  const groups = settings.hiddenGroups;
  const listed = new Set(groups.map(groupKey));
  const suggestions = seenGroups.filter(g => !listed.has(groupKey(g)));

  const add = () => {
    const name = draft.trim();
    if (name && !listed.has(groupKey(name))) saveSettings({ hiddenGroups: [...groups, name] });
    setDraft('');
  };

  return (
    <div class={settings.hideGroups ? 'groups' : 'groups disabled'}>
      <ul>
        {groups.map(g => (
          <li key={g}>
            <span>{g}</span>
            <button
              title={`Stop hiding ${g}`}
              onClick={() => saveSettings({ hiddenGroups: groups.filter(x => x !== g) })}
            >
              ✕
            </button>
          </li>
        ))}
        {groups.length === 0 && <li class="muted">No groups listed.</li>}
      </ul>
      <form
        onSubmit={e => {
          e.preventDefault();
          add();
        }}
      >
        <input
          list="seen-groups"
          placeholder="Group name"
          value={draft}
          onInput={e => setDraft((e.target as HTMLInputElement).value)}
        />
        <datalist id="seen-groups">
          {suggestions.map(g => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <button type="submit">Add</button>
      </form>
      <button class="link" onClick={() => saveSettings({ hiddenGroups: DEFAULT_HIDDEN_GROUPS })}>
        Reset to defaults
      </button>
    </div>
  );
}

const formatBytes = (bytes: number) =>
  bytes < 1e6 ? `${Math.round(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1)} MB`;

/** Saved fetches and lists (cache.ts); open dashboards keep what they already loaded. */
function CachedData() {
  const [bytes, setBytes] = useState<number | null>(null);
  const refresh = () => cachedDataBytes().then(setBytes);
  useEffect(() => {
    refresh();
  }, []);

  return (
    <div class="cache">
      <span class="muted">Cached data: {bytes === null ? '…' : formatBytes(bytes)}</span>
      <button class="link" disabled={!bytes} onClick={() => clearCachedData().then(refresh)}>
        Clear cached data
      </button>
    </div>
  );
}

function Popup() {
  const settings = useSettings();
  if (!settings) return null;
  return (
    <>
      <h1>Grading Dashboard</h1>
      <Toggle settings={settings} name="replaceGameSimulator" label="Replace Game Simulator button" />
      <Toggle settings={settings} name="openInNewTab" label="Open submissions in a new tab" />
      <Toggle
        settings={settings}
        name="useAltSubmissions"
        label="Use alternative Submissions menu (work in progress)"
      />
      <Toggle settings={settings} name="hideOwnSubmissions" label="Hide your own submissions" />
      <Toggle
        settings={settings}
        name="hideTutorSubmissions"
        label="Hide all tutors' submissions (including yours)"
      />
      <Toggle settings={settings} name="hideGroups" label="Hide groups" />
      <HiddenGroupsEditor settings={settings} />
      <CachedData />
    </>
  );
}

render(<Popup />, document.getElementById('root')!);
