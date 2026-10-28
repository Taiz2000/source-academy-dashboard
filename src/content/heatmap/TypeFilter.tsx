import { typeBadgeColor, typeKey } from '../assessmentTypes';
import { ChipFilter } from '../ChipFilter';

type Props = {
  types: string[];
  /** typeKeys that are switched on. */
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
};

/** One chip per assessment type, styled as SA's type badge when on. */
export function TypeFilter({ types, selected, onChange }: Props) {
  return (
    <ChipFilter
      chips={types.map(type => ({
        key: typeKey(type),
        name: type,
        color: typeBadgeColor(type),
        children: type,
      }))}
      allKeys={types.map(typeKey)}
      selected={selected}
      onChange={onChange}
    />
  );
}
