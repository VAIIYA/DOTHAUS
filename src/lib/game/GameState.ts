export interface Position {
    x: number;
    y: number;
}

export interface Player {
    id: string;
    name: string;
    color: string;
    x: number;
    y: number;
    radius: number;
    mass: number;
    isSpectator: boolean;
}

export interface Food {
    id: string;
    x: number;
    y: number;
    color: string;
    radius: number;
}

export interface GameState {
    players: Record<string, Player>;
    food: Record<string, Food>;
    mapWidth: number;
    mapHeight: number;
}

export const INITIAL_STATE: GameState = {
    players: {},
    food: {},
    mapWidth: 3000,
    mapHeight: 3000,
};
