import { proxy, useSnapshot } from 'valtio';
import { type User } from '../db/schema';

interface AppState {
    user: User | null;
    isAuthenticating: boolean;
}

export const appState = proxy<AppState>({
    user: null,
    isAuthenticating: false,
});

export const setUser = (user: User | null) => {
    appState.user = user;
};

export const setAuthenticating = (val: boolean) => {
    appState.isAuthenticating = val;
};

export const useAppState = () => {
    return useSnapshot(appState);
};
