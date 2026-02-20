import gameConfigJson from "./game-config.json";

export const GAME_CONFIG = gameConfigJson;

export type RoomConfig = (typeof GAME_CONFIG.rooms)[number];
export type RoomStatus = "WAITING" | "STARTING" | "ACTIVE" | "ENDED";

export const ROOM_BY_ID: Record<string, RoomConfig> = Object.fromEntries(
  GAME_CONFIG.rooms.map((room) => [room.id, room]),
);
