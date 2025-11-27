import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    
    const handler = (e: Event) => {
      if (isInstalled) return;
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    if (!isInstalled) {
      window.addEventListener('beforeinstallprompt', handler);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallButton(false);
    }
  };

  const handleDismiss = () => {
    setShowInstallButton(false);
  };

  if (!showInstallButton) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Install Qu-Zing!</h3>
          <p className="text-sm text-indigo-100">
            Install our app for a better experience and play offline!
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-indigo-200 hover:text-white transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 bg-white text-indigo-600 font-semibold py-2 px-4 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-2 text-indigo-200 hover:text-white transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setShowUpdate(true);
      });
    }
  }, []);

  const handleUpdate = () => {
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-gradient-to-r from-green-600 to-green-700 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-down">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">Update Available</h3>
          <p className="text-sm text-green-100">
            A new version is ready. Reload to update.
          </p>
        </div>
      </div>
      <button
        onClick={handleUpdate}
        className="w-full mt-3 bg-white text-green-600 font-semibold py-2 px-4 rounded-lg hover:bg-green-50 transition-colors"
      >
        Reload Now
      </button>
    </div>
  );
}
