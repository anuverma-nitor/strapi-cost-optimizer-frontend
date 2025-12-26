/**
 * Session Cache Utility
 * 
 * Caches the NextAuth session to avoid multiple /api/auth/session calls.
 * The session is cached for a short time (30 seconds) and refreshed as needed.
 */

import { getSession } from 'next-auth/react';

interface CachedSession {
    session: any;
    timestamp: number;
}

// Cache duration in milliseconds (30 seconds)
const CACHE_DURATION = 30 * 1000;

// Session cache
let cachedSession: CachedSession | null = null;
let sessionPromise: Promise<any> | null = null;

/**
 * Get cached session or fetch a new one if cache is expired
 * This prevents multiple simultaneous calls to /api/auth/session
 */
export async function getCachedSession(): Promise<any> {
    const now = Date.now();

    // Return cached session if still valid
    if (cachedSession && (now - cachedSession.timestamp) < CACHE_DURATION) {
        return cachedSession.session;
    }

    // If a fetch is already in progress, wait for it
    if (sessionPromise) {
        return sessionPromise;
    }

    // Fetch new session
    sessionPromise = getSession()
        .then(session => {
            cachedSession = {
                session,
                timestamp: Date.now(),
            };
            sessionPromise = null;
            return session;
        })
        .catch(error => {
            sessionPromise = null;
            throw error;
        });

    return sessionPromise;
}

/**
 * Clear the cached session (useful after logout)
 */
export function clearSessionCache(): void {
    cachedSession = null;
    sessionPromise = null;
}

/**
 * Update the cached session (useful when session changes)
 */
export function updateSessionCache(session: any): void {
    cachedSession = {
        session,
        timestamp: Date.now(),
    };
}

