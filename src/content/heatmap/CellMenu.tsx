import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';

import { bp } from '../blueprint';
import { Icon, type IconName } from '../icons';

export type MenuItem = {
  label: string;
  icon: IconName;
  onSelect: () => void;
  /** Why it can't be used right now; shown as its tooltip. */
  disabledReason?: string;
};

type Props = {
  /** Where the right-click happened, in viewport coordinates. */
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
};

/**
 * A Blueprint menu at the cursor, for right-clicking a heatmap cell. Closes on picking an item,
 * clicking elsewhere, Escape, scrolling or resizing.
 */
export function CellMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // Keep the whole menu on screen: open leftwards/upwards near the right/bottom edge.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: x + width > window.innerWidth - 4 ? Math.max(4, x - width) : x,
      top: y + height > window.innerHeight - 4 ? Math.max(4, y - height) : y,
    });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('blur', onClose);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('blur', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      class={`${bp('popover')} sad-cell-menu`}
      style={{ left: `${position.left}px`, top: `${position.top}px` }}
      onContextMenu={e => e.preventDefault()}
    >
      <div class={bp('popover-content')}>
        <ul class={bp('menu')} role="menu">
          {items.map(item => (
            <li key={item.label} role="none" title={item.disabledReason}>
              <a
                role="menuitem"
                tabIndex={item.disabledReason ? -1 : 0}
                aria-disabled={!!item.disabledReason}
                class={`${bp('menu-item')} ${item.disabledReason ? bp('disabled') : ''}`}
                onClick={() => {
                  if (item.disabledReason) return;
                  onClose();
                  item.onSelect();
                }}
              >
                <Icon name={item.icon} />
                <div class={bp('fill', 'text-overflow-ellipsis')}>{item.label}</div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
