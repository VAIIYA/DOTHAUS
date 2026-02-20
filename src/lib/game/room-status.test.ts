import { describe, expect, it } from "vitest";
import { isRoomJoinable, nextStatusAfterPlayerChange } from "./room-status";

describe("room status rules", () => {
  it("allows joining waiting/active rooms and blocks full/ended rooms", () => {
    expect(isRoomJoinable({ status: "WAITING", isLobby: false, players: 1, maxPlayers: 10 })).toBe(true);
    expect(isRoomJoinable({ status: "ACTIVE", isLobby: false, players: 9, maxPlayers: 10 })).toBe(true);
    expect(isRoomJoinable({ status: "ENDED", isLobby: false, players: 2, maxPlayers: 10 })).toBe(false);
    expect(isRoomJoinable({ status: "ACTIVE", isLobby: false, players: 10, maxPlayers: 10 })).toBe(false);
  });

  it("transitions STARTING room back to WAITING if player count drops", () => {
    expect(nextStatusAfterPlayerChange("STARTING", 1, false)).toBe("WAITING");
    expect(nextStatusAfterPlayerChange("STARTING", 2, false)).toBe("STARTING");
  });
});
