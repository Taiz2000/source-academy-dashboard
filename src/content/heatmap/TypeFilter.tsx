import { typeColor, typeKey } from '../assessmentTypes';

type Props = {
  types: string[];
  /** typeKeys that are switched off; empty means every type is shown. */
  excluded: Set<string>;
  onChange: (excluded: Set<string>) => void;
};

/** Toggle chips, one per assessment type. Ctrl/Cmd-click shows only that type. */
export function TypeFilter({ types, excluded, onChange }: Props) {
  const toggle = (type: string, only: boolean) => {
    const key = typeKey(type);
    if (only) {
      onChange(new Set(types.map(typeKey).filter(k => k !== key)));
      return;
    }
    const next = new Set(excluded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange(next);
  };

  return (
    <div class="type-filter">
      {types.map(type => {
        const selected = !excluded.has(typeKey(type));
        return (
          <button
            key={type}
            class={selected ? 'chip selected' : 'chip'}
            style={{ '--chip-color': typeColor(type) }}
            aria-pressed={selected}
            title={`${selected ? 'Hide' : 'Show'} ${type} (Ctrl/Cmd-click: show only ${type})`}
            onClick={e => toggle(type, e.ctrlKey || e.metaKey)}
          >
            {type}
          </button>
        );
      })}
      {excluded.size > 0 && (
        <button class="link" onClick={() => onChange(new Set())}>
          Show all
        </button>
      )}
      {types.some(type => !excluded.has(typeKey(type))) && (
        <button class="link" onClick={() => onChange(new Set(types.map(typeKey)))}>
          Hide all
        </button>
      )}
    </div>
  );
}
