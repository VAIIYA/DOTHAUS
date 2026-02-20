export type RoomStatus = "WAITING" | "STARTING" | "ACTIVE" | "ENDED";

interface JoinabilityInput {
  status: RoomStatus;
  isLobby: boolean;
  players: number;
  maxPlayers: number;
}

export function isRoomJoinable(input: JoinabilityInput): boolean {
  if (input.players >= input.maxPlayers) return false;
  if (input.isLobby) return true;
  return input.status === "WAITING" || input.status === "STARTING" || input.status === "ACTIVE";
}

export function nextStatusAfterPlayerChange(status: RoomStatus, playerCount: number, isLobby: boolean): RoomStatus {
  if (isLobby) return "ACTIVE";
  if (status === "STARTING" && playerCount < 2) return "WAITING";
  if (status === "ACTIVE" && playerCount <= 0) return "WAITING";
  return status;
}
