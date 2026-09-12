import { useEffect } from 'react';
import { useUserStore } from '../store/userStore';

export function GoogleTranslateSync() {
    const appLanguage = useUserStore((state) => state.appLanguage);

    useEffect(() => {
        const syncLanguage = () => {
            const currentCookie = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
            const currentTranslatedLang = currentCookie ? currentCookie[1] : 'en';

            if (currentTranslatedLang !== appLanguage) {
                // Set the Google Translate cookie
                document.cookie = `googtrans=/en/${appLanguage}; path=/`;
                document.cookie = `googtrans=/en/${appLanguage}; path=/; domain=${window.location.hostname}`;
                
                // Force a reload to apply the translation natively
                window.location.reload();
            }
        };

        syncLanguage();

        // No need for interval anymore since we handle it on mount and reload
    }, [appLanguage]);

    return null; // This is a logic-only component
}
