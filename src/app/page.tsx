import { Navbar } from "@/components/layout/Navbar";
import { RoomList } from "@/components/dashboard/RoomList";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen relative overflow-hidden bg-deep-space selection:bg-neon-blue selection:text-deep-space">
      <Navbar />

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-neon-blue/10 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-plasma-purple/10 rounded-full blur-[100px]" />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto text-center flex flex-col items-center justify-center min-h-[80vh]">
        <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter mb-6 font-heading">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-plasma-purple neon-text">
            DOMINATE
          </span>
          <br />
          <span className="text-white">THE BLOCKCHAIN</span>
        </h1>

        <p className="text-xl md:text-2xl text-starlight/80 max-w-2xl mx-auto mb-12 font-light">
          The ultimate Agar-style battle functionality powered by Solana.
          <span className="block mt-2 font-bold text-neon-blue">
            Play. Survive. Earn.
          </span>
        </p>

        <div className="flex flex-col md:flex-row gap-6 items-center">
          <Link href="/play">
            <button className="group relative px-8 py-4 bg-neon-blue text-deep-space font-black text-xl uppercase tracking-wider clip-path-slant hover:scale-105 transition-transform duration-200 cursor-pointer">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
              <span className="relative">Play as Guest</span>
            </button>
          </Link>

          <button className="px-8 py-4 border border-neon-blue/30 bg-deep-space/50 text-neon-blue font-bold text-xl uppercase tracking-wider hover:bg-neon-blue/10 transition-colors duration-200 backdrop-blur-md">
            View Rooms
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RoomList />
        </div>
        <div>
          <Leaderboard />
        </div>
      </div>

      {/* Grid Overlay */}
      <div
        className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none"
      />
    </main>
  );
}
