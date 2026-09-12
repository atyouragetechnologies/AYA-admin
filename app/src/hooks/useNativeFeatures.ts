import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { TextZoom } from '@capacitor/text-zoom';
import { Network } from '@capacitor/network';

/** True when running inside the Capacitor Android/iOS app (not a browser tab) */
export const isNativeApp = Capacitor.isNativePlatform();
/** Alias for clarity in Android-specific code */
export const isAndroid = isNativeApp && Capacitor.getPlatform() === 'android';

/**
 * Plays a haptic feedback at the appropriate intensity level.
 * - 'success' → notification-type buzz (story complete, level up)
 * - 'good'    → medium impact (positive choice)
 * - 'bad'     → heavy impact (negative choice)  
 * - 'tap'     → light tap (navigation, UI)
 */
export const playHaptic = (type: 'success' | 'good' | 'bad' | 'tap' = 'tap') => {
  if (!isNativeApp) return;
  switch (type) {
    case 'success':
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
      break;
    case 'good':
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
      break;
    case 'bad':
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
      break;
    case 'tap':
    default:
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      break;
  }
};

/**
 * Hook to initialize all Capacitor Native features.
 * Keeps App.tsx clean and modular.
 */
export function useNativeFeatures() {
  useEffect(() => {
    // 1. Initialize Native Plugins
    const initNativeFeatures = async () => {
      try {
        // Tag <body> so all CSS can target Android specifically
        if (isNativeApp) {
          document.body.classList.add('is-android');
        }

        await KeepAwake.keepAwake();

        // Edge-to-edge: let WebView content render behind the status bar
        // CSS env(safe-area-inset-top) will push content down appropriately
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: Style.Dark });

        // Lock text zoom so system accessibility settings don't break the UI layout
        await TextZoom.set({ value: 1.0 });

        // Listen for custom events so individual screens can hide/show status bar
        const handleHideStatusBar = () => {
          StatusBar.hide().catch(() => {});
        };
        const handleShowStatusBar = () => {
          StatusBar.show().catch(() => {});
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
          StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
        };
        window.addEventListener('aya-hide-statusbar', handleHideStatusBar);
        window.addEventListener('aya-show-statusbar', handleShowStatusBar);

        // ── NETWORK OFFLINE INDICATOR ──────────────────────────────────────
        // Check initial connectivity and listen for changes
        const netStatus = await Network.getStatus();
        if (!netStatus.connected) {
          document.body.classList.add('is-offline');
        }
        await Network.addListener('networkStatusChange', (status) => {
          if (!status.connected) {
            document.body.classList.add('is-offline');
            // Dispatch custom event so any screen can show its own offline UI
            window.dispatchEvent(new CustomEvent('aya-offline'));
          } else {
            document.body.classList.remove('is-offline');
            window.dispatchEvent(new CustomEvent('aya-online'));
          }
        });

        // ── APP STATE CHANGE: RESUME BGM AFTER BACKGROUNDING ──────────────
        // On Android, when user switches back to the app from another app,
        // AudioContext gets suspended. This restores BGM seamlessly.
        await CapApp.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            // App came to foreground — resume AudioContext and BGM
            // Small delay to let the WebView re-gain focus first
            setTimeout(async () => {
              try {
                const { bgmManager } = await import('../utils/bgmManager');
                // bgmManager.unlock() resumes ctx if suspended and replays pending track
                await bgmManager.unlock();
              } catch {}
            }, 300);
          } else {
            // App went to background — pause AudioContext to save battery
            // BGM will auto-resume when app comes back (above)
            try {
              const { getCtx } = await import('../utils/audioManager');
              const ctx = getCtx();
              if (ctx && ctx.state === 'running') {
                await ctx.suspend();
              }
            } catch {}
          }
        });

        // ── HANDLE PHYSICAL BACK BUTTON ────────────────────────────────────
        await CapApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
          // Simulate Escape key to close modals gracefully
          const openDialog = document.querySelector('[role="dialog"], dialog[open]');
          if (openDialog) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
            return;
          }
          if (canGoBack) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });

        // Hide splash screen smoothly now that React has fully mounted
        await SplashScreen.hide();

      } catch (e) {
        console.log("Native features not supported on this platform", e);
      }
    };
    initNativeFeatures();

    // 2. Global Haptics Listener for interactive elements (light tap for all buttons)
    const handleGlobalHaptics = (e: MouseEvent | TouchEvent) => {
      if (!isNativeApp) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, a, [role="button"]')) {
        Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
      }
    };
    
    document.addEventListener('click', handleGlobalHaptics, { capture: true, passive: true });
    
    return () => {
      document.removeEventListener('click', handleGlobalHaptics, { capture: true });
      Network.removeAllListeners();
      CapApp.removeAllListeners();
    };
  }, []);
}
