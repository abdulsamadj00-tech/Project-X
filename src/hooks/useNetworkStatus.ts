import { useState, useEffect, useCallback, useRef } from 'react';

export type SyncStatusState = 'synced' | 'pending' | 'syncing' | 'error' | 'offline';

export interface NetworkStatus {
    isOnline: boolean;
    isFirestoreConnected: boolean;
    lastOnlineAt: number | null;
    syncStatus: SyncStatusState;
    pendingCount: number;
    checkConnection: () => Promise<boolean>;
}

export function useNetworkStatus(): NetworkStatus {
    const [isOnline, setIsOnline] = useState<boolean>(() => 
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
    const [lastOnlineAt, setLastOnlineAt] = useState<number | null>(() => Date.now());
    const [syncStatus, setSyncStatus] = useState<SyncStatusState>('synced');
    const [pendingCount, setPendingCount] = useState<number>(0);
    const checkTimerRef = useRef<number | null>(null);

    // Active connection check (verifies real backend reachability)
    const checkConnection = useCallback(async (): Promise<boolean> => {
        if (!navigator.onLine) {
            setIsOnline(false);
            setIsFirestoreConnected(false);
            setSyncStatus('offline');
            return false;
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 4000);
            
            const res = await fetch('/api/health', {
                method: 'GET',
                signal: controller.signal,
                cache: 'no-store'
            });
            clearTimeout(timeout);

            const connected = res.ok;
            setIsFirestoreConnected(connected);
            setIsOnline(true);
            setLastOnlineAt(Date.now());
            return connected;
        } catch {
            // Even if server health check times out, browser might have network
            const browserOnline = navigator.onLine;
            setIsOnline(browserOnline);
            setIsFirestoreConnected(false);
            return false;
        }
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setLastOnlineAt(Date.now());
            checkConnection();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setIsFirestoreConnected(false);
            setSyncStatus('offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Periodic light heartbeat check every 30 seconds
        checkTimerRef.current = window.setInterval(() => {
            if (navigator.onLine) {
                checkConnection();
            }
        }, 30000);

        // Initial check
        checkConnection();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (checkTimerRef.current) {
                clearInterval(checkTimerRef.current);
            }
        };
    }, [checkConnection]);

    return {
        isOnline,
        isFirestoreConnected,
        lastOnlineAt,
        syncStatus,
        pendingCount,
        checkConnection
    };
}
