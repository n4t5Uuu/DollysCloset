"use client";

const MANUAL_LOGOUT_STORAGE_KEY = "dc-manual-logout-at";
const MANUAL_LOGOUT_TTL_MS = 15_000;

function getStorage() {
    if (typeof window === "undefined") {
        return null;
    }

    return window.sessionStorage;
}

export function markManualLogoutIntent() {
    getStorage()?.setItem(MANUAL_LOGOUT_STORAGE_KEY, String(Date.now()));
}

export function clearManualLogoutIntent() {
    getStorage()?.removeItem(MANUAL_LOGOUT_STORAGE_KEY);
}

export function consumeManualLogoutIntent() {
    const storage = getStorage();
    const rawValue = storage?.getItem(MANUAL_LOGOUT_STORAGE_KEY);

    if (!storage || !rawValue) {
        return false;
    }

    storage.removeItem(MANUAL_LOGOUT_STORAGE_KEY);

    const timestamp = Number(rawValue);

    if (!Number.isFinite(timestamp)) {
        return false;
    }

    return Date.now() - timestamp <= MANUAL_LOGOUT_TTL_MS;
}
