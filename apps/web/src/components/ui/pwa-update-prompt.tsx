import { useRegisterSW } from 'virtual:pwa-register/react';

import { Button } from './button';

/**
 * With `registerType: 'prompt'` a new service worker waits until the student
 * accepts it, so a background update never breaks an in-flight lazy chunk.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 shadow-2xl"
    >
      <span>A new version of DeckUp is available.</span>
      <Button size="sm" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
    </div>
  );
}
