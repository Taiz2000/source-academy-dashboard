// SA's showSimpleConfirmDialog (commons/utils/DialogHelper.tsx, dialogs/ConfirmDialog.tsx): a dark
// Blueprint dialog without a title, the message, then "No" and the action. Unlike SA, Escape and
// clicking outside the dialog also answer "No".
import type { ComponentChildren } from 'preact';
import { render } from 'preact';
import { useEffect } from 'preact/hooks';

import { bp } from '../blueprint';

export type ConfirmOptions = {
  contents: ComponentChildren;
  positiveLabel: string;
  positiveIntent: 'primary' | 'danger';
};

function Dialog({ contents, positiveLabel, positiveIntent, onAnswer }: ConfirmOptions & {
  onAnswer: (yes: boolean) => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onAnswer(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [onAnswer]);

  return (
    <div class={bp('overlay', 'overlay-open', 'overlay-scroll-container')}>
      {/*
        Clicks outside the dialog land on the backdrop (Blueprint makes the full-screen dialog
        container ignore the pointer), or on the container where it doesn't.
      */}
      <div class={bp('overlay-backdrop')} onMouseDown={() => onAnswer(false)} />
      <div
        class={bp('dialog-container', 'overlay-content')}
        role="dialog"
        aria-modal
        onMouseDown={e => e.target === e.currentTarget && onAnswer(false)}
      >
        <div class={`${bp('dialog', 'dark')} sad-confirm-dialog`}>
          <div class={bp('dialog-body')}>{contents}</div>
          <div class={bp('dialog-footer')}>
            <div class={bp('dialog-footer-actions')}>
              <button type="button" class={bp('button')} onClick={() => onAnswer(false)}>
                <span class={bp('button-text')}>No</span>
              </button>
              <button
                type="button"
                class={bp('button', `intent-${positiveIntent}`)}
                ref={el => el?.focus()}
                onClick={() => onAnswer(true)}
              >
                <span class={bp('button-text')}>{positiveLabel}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Shows the dialog over the page; resolves true for the action, false for "No". */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const portal = document.createElement('div');
    portal.className = bp('portal');
    document.body.append(portal);
    const answer = (yes: boolean) => {
      render(null, portal);
      portal.remove();
      resolve(yes);
    };
    render(<Dialog {...options} onAnswer={answer} />, portal);
  });
}
