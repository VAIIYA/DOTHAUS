export interface Position {
    x: number;
    y: number;
}

export interface Fragment {
    id: number;
    x: number;
    y: number;
    radius: number;
    mass: number;
}

export interface Player {
    id: string;
    name: string;
    color: string;
    fragments: Fragment[];
    totalMass?: number;
}

export interface Food {
    id: string;
    x: number;
    y: number;
    color: string;
    radius: number;
}

export interface Virus {
    id: string;
    x: number;
    y: number;
    radius: number;
}

export interface EjectedMass {
    id: string;
    x: number;
    y: number;
    color: string;
    radius: number;
}

export interface GameState {
    players: Record<string, Player>;
    food: Record<string, Food>;
    viruses: Record<string, Virus>;
    ejectedMass: Record<string, EjectedMass>;
    mapWidth: number;
    mapHeight: number;
    status: "WAITING" | "STARTING" | "ACTIVE" | "ENDED";
    countdown: number;
    winnerName?: string | null;
}

export const INITIAL_STATE: GameState = {
    players: {},
    food: {},
    viruses: {},
    ejectedMass: {},
    mapWidth: 3000,
    mapHeight: 3000,
    status: "WAITING",
    countdown: 0,
};
