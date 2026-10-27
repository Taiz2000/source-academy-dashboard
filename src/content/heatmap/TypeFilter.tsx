import { typeBadgeColor, typeKey } from '../assessmentTypes';
import { badgeClass } from '../badges';

type Props = {
  types: string[];
  /** typeKeys that are switched on. */
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
};

/** One chip per assessment type, styled as SA's type badge when on. Ctrl/Cmd-click: only that type. */
export function TypeFilter({ types, selected, onChange }: Props) {
  const toggle = (type: string, only: boolean) => {
    const key = typeKey(type);
    if (only) {
      onChange(new Set([key]));
      return;
    }
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  const isSelected = (type: string) => selected.has(typeKey(type));

  return (
    <div class="sad-type-filter">
      {types.map(type => {
        const on = isSelected(type);
        return (
          <button
            key={type}
            type="button"
            class={`sad-chip ${badgeClass(typeBadgeColor(type))} ${on ? '' : 'sad-chip-off'}`}
            aria-pressed={on}
            title={`${on ? 'Hide' : 'Show'} ${type} (Ctrl/Cmd-click: show only ${type})`}
            onClick={e => toggle(type, e.ctrlKey || e.metaKey)}
          >
            {type}
          </button>
        );
      })}
      {!types.every(isSelected) && (
        <button type="button" class="sad-link" onClick={() => onChange(new Set(types.map(typeKey)))}>
          Show all
        </button>
      )}
      {types.some(isSelected) && (
        <button type="button" class="sad-link" onClick={() => onChange(new Set())}>
          Hide all
        </button>
      )}
    </div>
  );
}
