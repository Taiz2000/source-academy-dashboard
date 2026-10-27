import { typeColor, typeKey } from '../assessmentTypes';

type Props = {
  types: string[];
  /** typeKeys that are switched on. */
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
};

/** Toggle chips, one per assessment type. Ctrl/Cmd-click shows only that type. */
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
    <div class="type-filter">
      {types.map(type => {
        const on = isSelected(type);
        return (
          <button
            key={type}
            class={on ? 'chip selected' : 'chip'}
            style={{ '--chip-color': typeColor(type) }}
            aria-pressed={on}
            title={`${on ? 'Hide' : 'Show'} ${type} (Ctrl/Cmd-click: show only ${type})`}
            onClick={e => toggle(type, e.ctrlKey || e.metaKey)}
          >
            {type}
          </button>
        );
      })}
      {!types.every(isSelected) && (
        <button class="link" onClick={() => onChange(new Set(types.map(typeKey)))}>
          Show all
        </button>
      )}
      {types.some(isSelected) && (
        <button class="link" onClick={() => onChange(new Set())}>
          Hide all
        </button>
      )}
    </div>
  );
}
