import type { ComponentChildren } from 'preact';

import { badgeClass, type BadgeColor } from './badges';

export type Chip<K> = {
  key: K;
  /** Used in the chip's tooltip. */
  name: string;
  color: BadgeColor;
  children: ComponentChildren;
};

type Props<K> = {
  chips: Chip<K>[];
  /** Every key "Show all" switches on, including keys without a chip right now. */
  allKeys: readonly K[];
  /** Keys that are switched on. */
  selected: ReadonlySet<K>;
  onChange: (selected: Set<K>) => void;
};

/**
 * Toggle chips styled as SA's badges when on and dashed when off, followed by "Show all" /
 * "Hide all" links, offered when they would change a visible chip. Ctrl/Cmd-click a chip to show
 * only that one.
 */
export function ChipFilter<K>({ chips, allKeys, selected, onChange }: Props<K>) {
  const toggle = (key: K, only: boolean) => {
    if (only) {
      onChange(new Set([key]));
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div class="sad-chips">
      {chips.map(chip => {
        const on = selected.has(chip.key);
        return (
          <button
            key={chip.name}
            type="button"
            class={`sad-chip ${badgeClass(chip.color)} ${on ? '' : 'sad-chip-off'}`}
            aria-pressed={on}
            title={`${on ? 'Hide' : 'Show'} ${chip.name} (Ctrl/Cmd-click: show only ${chip.name})`}
            onClick={e => toggle(chip.key, e.ctrlKey || e.metaKey)}
          >
            {chip.children}
          </button>
        );
      })}
      {chips.some(c => !selected.has(c.key)) && (
        <button type="button" class="sad-link" onClick={() => onChange(new Set(allKeys))}>
          Show all
        </button>
      )}
      {chips.some(c => selected.has(c.key)) && (
        <button type="button" class="sad-link" onClick={() => onChange(new Set())}>
          Hide all
        </button>
      )}
    </div>
  );
}
