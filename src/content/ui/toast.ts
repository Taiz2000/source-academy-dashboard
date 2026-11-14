// SA's notices (showSuccessMessage / showWarningMessage): Blueprint toasts at the top of the page.
import { bp } from '../blueprint';
import { iconHtml } from '../icons';

let container: HTMLElement | null = null;

function toastContainer(): HTMLElement {
  if (container?.isConnected) return container;
  const portal = document.createElement('div');
  portal.className = bp('portal');
  container = document.createElement('div');
  container.className = bp(
    'toast-container',
    'overlay',
    'overlay-open',
    'toast-container-top',
    'toast-container-in-portal',
  );
  portal.append(container);
  document.body.append(portal);
  return container;
}

function show(message: string, intent: 'success' | 'warning', timeout: number) {
  const toast = document.createElement('div');
  toast.className = bp('toast', `intent-${intent}`, 'overlay-content');
  toast.tabIndex = 0;
  const text = document.createElement('span');
  text.className = bp('toast-message');
  text.textContent = message;
  const buttons = document.createElement('div');
  buttons.className = bp('button-group', 'minimal');
  const close = document.createElement('button');
  close.type = 'button';
  close.className = bp('button');
  close.setAttribute('aria-label', 'Close');
  close.innerHTML = iconHtml('cross');
  buttons.append(close);
  toast.append(text, buttons);

  const dismiss = () => toast.remove();
  close.addEventListener('click', dismiss);
  toastContainer().prepend(toast);
  setTimeout(dismiss, timeout);
}

export const showSuccess = (message: string, timeout = 1000) => show(message, 'success', timeout);

/** Long backend errors are summarised by status, as SA does (handleResponseError). */
export function showWarning(message: string, status?: number, timeout = 4000) {
  const text = message.length > 100 && status ? `Something went wrong (got ${status} response)` : message;
  show(text, 'warning', timeout);
}
