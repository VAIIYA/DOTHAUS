"use client";

import { RoomCard } from "./RoomCard";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GAME_CONFIG } from "@/config/game-config";
import { trackEvent } from "@/lib/analytics";

interface RoomSummary {
    id: string;
    name: string;
    price: number;
    players: number;
    maxPlayers: number;
    status: "WAITING" | "STARTING" | "ACTIVE" | "ENDED";
    isLobby: boolean;
    region?: string;
    updatedAt?: string;
}

export const RoomList = () => {
    const router = useRouter();
    const [rooms, setRooms] = useState<RoomSummary[]>([]);
    const [pingMs, setPingMs] = useState<number | null>(null);
    const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

    useEffect(() => {
        trackEvent("landing_viewed");
        let isMounted = true;
        let timer: ReturnType<typeof setInterval> | null = null;

        const fetchRooms = async () => {
            try {
                const startedAt = performance.now();
                const response = await fetch("/api/rooms");
                if (!response.ok) return;
                const payload = (await response.json()) as RoomSummary[];
                if (isMounted) {
                    setRooms(payload);
                    setPingMs(Math.round(performance.now() - startedAt));
                    setLastUpdatedAt(new Date().toISOString());
                }
            } catch (error) {
                console.error("Failed to fetch rooms:", error);
            }
        };

        fetchRooms();
        timer = setInterval(fetchRooms, 2000);

        return () => {
            isMounted = false;
            if (timer) clearInterval(timer);
        };
    }, []);

    const displayRooms = useMemo<RoomSummary[]>(() => {
        if (rooms.length > 0) return rooms;
        return GAME_CONFIG.rooms.map((room) => ({
            id: room.id,
            name: room.name || `${room.price} USDC`,
            price: room.price,
            players: 0,
            maxPlayers: room.maxPlayers,
            status: (room.isLobby ? "ACTIVE" : "WAITING") as RoomSummary["status"],
            isLobby: room.isLobby,
            region: "Auto",
            updatedAt: new Date().toISOString(),
        }));
    }, [rooms]);

    const handleJoin = (roomId: string, price: number, spectate?: boolean) => {
        console.log(`Joining room ${roomId} for ${price} USDC`);
        trackEvent(spectate ? "room_spectate_clicked" : "room_join_clicked", { roomId, price });
        router.push(spectate ? `/play?room=${roomId}&spectate=1` : `/play?room=${roomId}`);
    };

    return (
        <section id="rooms" className="py-20 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-16 text-center">
                    <h2 className="text-5xl md:text-7xl font-bold font-serif mb-6 text-vaiiya-indigo tracking-tight">
                        BATTLE ARENAS
                    </h2>
                    <p className="text-starlight max-w-2xl mx-auto text-lg md:text-xl font-medium">
                        Select your stake. Winner takes the pot (minus 5% house fee).
                        <br />
                        <span className="text-vaiiya-orange font-bold mt-2 inline-block">New: Practice Arena is now open for free play!</span>
                    </p>
                    <div className="mt-6 text-xs font-semibold text-gray-400">
                        Region: {displayRooms[0]?.region || "Auto"} · Ping: {pingMs ?? "--"}ms · Updated: {lastUpdatedAt ? new Date(lastUpdatedAt).toLocaleTimeString() : "--"}
                    </div>
                </div>

                {/* Lobby Room - Featured */}
                <div className="mb-12">
                    {displayRooms.filter(r => r.id === "0").map(room => (
                        <RoomCard
                            key={room.id}
                            {...room}
                            onJoin={handleJoin}
                        />
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 md:gap-10">
                    {displayRooms.filter(r => r.id !== "0").map((room) => (
                        <RoomCard
                            key={room.id}
                            {...room}
                            onJoin={handleJoin}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};
