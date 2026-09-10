import { useEffect } from 'react';

/**
 * Closes an overlay when Escape is pressed.
 *
 * Dialogs here are plain divs rather than <dialog>, so nothing gives them
 * Escape-to-dismiss for free; without this a keyboard user who opens one has no
 * way out except tabbing to the close button.
 */
export function useEscapeKey(onEscape: () => void, active = true) {
  useEffect(() => {
    if (!active) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape, active]);
}
