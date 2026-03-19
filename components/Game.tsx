"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const PREDEFINED_NAMES = [
  "Eranda", "Sandeepa", "Sameera", "Yashodha", "Thaksha", "Sandamalee", 
  "Rasheed", "Udaya", "Shafras", "Mirdula", "Chathurangi", 
  "Aqeel", "Shakir", "Safna", "Kavindu", "Nilo", "Madawa", 
  "Kanishka", "Chami", "Anupama", "Janani", "Christina", 
  "Shavinda", "Dextor", "Pathum", "Venujan", "Sanjaya", 
  "Nash", "Aider", "Dilshan", "Thilak", "Nuwan"
];

type Player = {
  id: string;
  name: string;
  isReady: boolean;
  savedBy: string | null;
  reason: string | null;
};

type GameState = {
  status: "waiting" | "playing" | "finished";
  players: Player[];
};

let socket: Socket;

export default function Game() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [joined, setJoined] = useState(false);
  const [savedBy, setSavedBy] = useState("");
  const [reason, setReason] = useState("");
  const [joinError, setJoinError] = useState("");
  const [adminClickCount, setAdminClickCount] = useState(0);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showWallOfShame, setShowWallOfShame] = useState(false);

  useEffect(() => {
    // Connect to socket
    socket = io();

    socket.on("gameState", (state: GameState) => {
      setGameState(state);
    });

    socket.on("joinSuccess", (joinedName: string) => {
      setName(joinedName);
      setJoined(true);
      setJoinError("");
      if (joinedName.toLowerCase() === "admin") {
        setIsAdmin(true);
      }
    });

    socket.on("joinError", (error: string) => {
      setJoinError(error);
    });

    // Auto-rejoin if session exists
    const savedName = sessionStorage.getItem("playerName");
    const savedSessionId = sessionStorage.getItem("sessionId");
    if (savedName && savedSessionId) {
      socket.emit("join", { name: savedName, sessionId: savedSessionId });
    }

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      let sessionId = sessionStorage.getItem("sessionId");
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        sessionStorage.setItem("sessionId", sessionId);
      }
      sessionStorage.setItem("playerName", name);
      socket.emit("join", { name, sessionId });
    }
  };

  const handleSecretAdminAccess = () => {
    setAdminClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setName("admin");
        return 0;
      }
      return newCount;
    });
  };

  const handleStartGame = () => {
    socket.emit("startGame");
  };

  const handleResetGame = () => {
    socket.emit("resetGame");
    setJoined(false);
    setName("");
    setIsAdmin(false);
  };

  const handleSubmitChoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (savedBy && reason) {
      socket.emit("submitChoice", { savedBy, reason });
    }
  };

  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen bg-black text-orange-500">Loading...</div>;
  }

  if (!joined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-950/40 via-zinc-950 to-black p-4">
        <Card className="w-full max-w-md bg-zinc-900/80 border-orange-900/50 backdrop-blur-sm shadow-[0_0_30px_rgba(234,88,12,0.1)] text-zinc-100">
          <CardHeader>
            <CardTitle 
              className="text-3xl font-bold text-center text-orange-500 cursor-default select-none"
              onClick={handleSecretAdminAccess}
            >
              🔥 Save Friend
            </CardTitle>
            <CardDescription className="text-center text-zinc-400">
              In an office fire, who saves you first and why?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-zinc-300">Select your name</Label>
                <Select value={name} onValueChange={(val) => setName(val || "")} required>
                  <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 focus:ring-orange-500 text-zinc-100">
                    <SelectValue placeholder="Select your name" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[300px]">
                    {name === "admin" && (
                      <SelectItem value="admin" className="text-orange-500 font-bold focus:bg-zinc-900 focus:text-orange-400 hover:bg-zinc-900 hover:text-orange-400 data-[highlighted]:bg-zinc-900 data-[highlighted]:text-orange-400">Host (Admin)</SelectItem>
                    )}
                    {PREDEFINED_NAMES.map((n) => (
                      <SelectItem key={n} value={n} className="focus:bg-orange-900 focus:text-orange-400 hover:bg-orange-900 hover:text-orange-400 data-[highlighted]:bg-orange-900 data-[highlighted]:text-orange-400">{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {joinError && <p className="text-red-500 text-sm mt-1">{joinError}</p>}
              </div>
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={!name}>Join Game</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-950/20 via-zinc-950 to-black p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-orange-500">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleResetGame} className="border-orange-800 text-orange-500 hover:bg-orange-950/50 hover:text-orange-400">Reset Game</Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Card className="bg-zinc-900/60 border-orange-900/30 text-zinc-100">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-1">
                <span className="text-zinc-400 text-sm uppercase tracking-wider">Total Office Staff</span>
                <span className="text-4xl font-black text-orange-500">{PREDEFINED_NAMES.length}</span>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900/60 border-orange-900/30 text-zinc-100">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-1">
                <span className="text-zinc-400 text-sm uppercase tracking-wider">Joined Players</span>
                <span className="text-4xl font-black text-orange-500">{gameState.players.filter(p => p.name !== "admin").length}</span>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-zinc-900/80 border-orange-900/50 backdrop-blur-sm text-zinc-100 shadow-[0_0_20px_rgba(234,88,12,0.05)]">
            <CardHeader>
              <CardTitle className="text-orange-400">Game Status: {gameState.status.toUpperCase()}</CardTitle>
              <CardDescription className="text-zinc-400">
                {gameState.status === "waiting" && "Waiting for players to join..."}
                {gameState.status === "playing" && "Players are making their choices..."}
                {gameState.status === "finished" && "All players have submitted!"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gameState.status === "waiting" && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg text-zinc-200">Joined Players ({gameState.players.filter(p => p.name !== "admin").length})</h3>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-300">
                    {gameState.players.filter(p => p.name !== "admin").map((p) => (
                      <li key={p.id}>{p.name}</li>
                    ))}
                  </ul>
                  {gameState.players.filter(p => p.name !== "admin").length > 0 && (
                    <Button onClick={handleStartGame} className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">Start Game</Button>
                  )}
                </div>
              )}

              {gameState.status !== "waiting" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-xl text-zinc-200">Results</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {gameState.players.filter(p => p.name !== "admin").map((p) => (
                      <Card 
                        key={p.id} 
                        className={`bg-zinc-950/50 border-orange-900/30 text-zinc-100 transition-all hover:border-orange-500/50 ${p.savedBy ? 'cursor-pointer' : 'opacity-70'}`}
                        onClick={() => p.savedBy && setSelectedPlayer(p)}
                      >
                        <CardHeader className="p-4">
                          <div className="flex justify-between items-start">
                            <CardTitle className="text-lg text-orange-400">{p.name}</CardTitle>
                            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${p.savedBy ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}`}>
                              {p.savedBy ? "Submitted" : "Pending"}
                            </span>
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>

                  {gameState.status === "finished" && (
                    <div className="flex justify-center pt-4">
                      <Button 
                        onClick={() => setShowWallOfShame(!showWallOfShame)}
                        className={`${showWallOfShame ? 'bg-zinc-800 border-zinc-700' : 'bg-red-600 hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.2)]'} text-white transition-all px-8 py-6 text-lg font-bold`}
                      >
                        {showWallOfShame ? "Hide the Shame" : "Reveal the Burned 🔥"}
                      </Button>
                    </div>
                  )}

                  <AnimatePresence>
                    {gameState.status === "finished" && showWallOfShame && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, y: 20 }}
                        animate={{ opacity: 1, height: "auto", y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 20 }}
                        className="mt-12 space-y-4 p-6 bg-red-950/20 border border-red-900/30 rounded-xl overflow-hidden"
                      >
                        <h3 className="font-bold text-2xl text-red-500 flex items-center gap-3">
                          <span className="animate-pulse">🔥</span> 
                          Left to Burn (Zero Saves)
                          <span className="animate-pulse">🔥</span>
                        </h3>
                        <p className="text-red-400/80 text-sm italic">These colleagues might need to bring more donuts to the office...</p>
                        <div className="flex flex-wrap gap-3 mt-4">
                          {PREDEFINED_NAMES.filter(n => !gameState.players.some(p => p.savedBy === n)).map((coward, i) => (
                            <motion.div
                              key={coward}
                              initial={{ opacity: 0, scale: 0.5, rotate: Math.random() * 20 - 10 }}
                              animate={{ opacity: 1, scale: 1, rotate: Math.random() * 10 - 5 }}
                              whileHover={{ scale: 1.1, rotate: Math.random() * 20 - 10 }}
                              transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 15 }}
                              className="px-4 py-2 bg-red-950/60 border border-red-900/50 rounded-lg text-red-400 text-sm font-semibold shadow-[0_0_15px_rgba(239,68,68,0.1)] cursor-default"
                            >
                              {coward} 🏃‍♂️💨
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Player Details Modal */}
          {selectedPlayer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <Card className="w-full max-w-md bg-zinc-900 border-orange-500/50 shadow-[0_0_50px_rgba(234,88,12,0.2)] text-zinc-100 animate-in zoom-in-95 duration-200">
                <CardHeader className="border-b border-zinc-800 pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl text-orange-500">{selectedPlayer.name}&apos;s Choice</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedPlayer(null)}
                      className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                    >
                      ✕
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Saved</p>
                    <p className="text-2xl font-bold text-zinc-100">{selectedPlayer.savedBy}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Reason</p>
                    <div className="bg-zinc-950/50 p-4 rounded-lg border border-zinc-800 italic text-zinc-300 leading-relaxed">
                      &quot;{selectedPlayer.reason}&quot;
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t border-zinc-800 pt-4">
                  <Button 
                    onClick={() => setSelectedPlayer(null)} 
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Close
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Player View
  const currentPlayer = gameState.players.find((p) => p.name === name);
  const otherPlayers = gameState.players.filter((p) => p.name !== name);

  if (!currentPlayer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-black text-zinc-100">
        <p className="text-xl text-orange-500">You were disconnected or the game was reset.</p>
        <Button onClick={() => {
          setJoined(false);
          sessionStorage.removeItem("playerName");
          sessionStorage.removeItem("sessionId");
        }} className="bg-orange-600 hover:bg-orange-700 text-white">Return to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-orange-950/30 via-zinc-950 to-black p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-orange-500">Welcome, {name}</h1>
        </div>

        {gameState.status === "waiting" && (
          <Card className="bg-zinc-900/80 border-orange-900/50 backdrop-blur-sm text-zinc-100 shadow-[0_0_20px_rgba(234,88,12,0.05)]">
            <CardHeader>
              <CardTitle className="text-orange-400">Waiting for Admin to start...</CardTitle>
            </CardHeader>
          </Card>
        )}

        {gameState.status === "playing" && !currentPlayer.savedBy && (
          <Card className="bg-zinc-900/80 border-orange-900/50 backdrop-blur-sm text-zinc-100 shadow-[0_0_30px_rgba(234,88,12,0.15)]">
            <CardHeader>
              <CardTitle className="text-2xl text-orange-500">The Office is on Fire! 🔥</CardTitle>
              <CardDescription className="text-zinc-400 text-base">
                Smoke is filling the room. Who saves you first, and why?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitChoice} className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-zinc-300">Who are you saving:</Label>
                  <Select value={savedBy} onValueChange={(val) => setSavedBy(val || "")} required>
                    <SelectTrigger className="w-full bg-zinc-950 border-zinc-800 focus:ring-orange-500 text-zinc-100">
                      <SelectValue placeholder="Select a colleague" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100 max-h-[300px]">
                      {PREDEFINED_NAMES.filter(n => n !== name).map((n) => (
                        <SelectItem key={n} value={n} className="focus:bg-orange-900 focus:text-orange-400 hover:bg-orange-900 hover:text-orange-400 data-[highlighted]:bg-orange-900 data-[highlighted]:text-orange-400">{n}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-zinc-300">Why did you save them?</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Because I always bring donuts on Fridays..."
                    required
                    rows={4}
                    className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>

                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={!savedBy || !reason}>
                  Submit Answer
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {(gameState.status === "finished" || currentPlayer.savedBy) && (
          <Card className="bg-zinc-900/80 border-orange-900/50 backdrop-blur-sm text-zinc-100 shadow-[0_0_20px_rgba(234,88,12,0.05)]">
            <CardHeader>
              <CardTitle className="text-orange-400">Answer Submitted! ✅</CardTitle>
              <CardDescription className="text-zinc-400">
                Waiting for others to finish. The admin will reveal the results!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-zinc-950/50 border border-orange-900/30 rounded-lg">
                <p className="font-medium text-zinc-200">You were saved by: <span className="text-orange-500">{currentPlayer.savedBy}</span></p>
                <p className="text-zinc-400 mt-2 italic">&quot;{currentPlayer.reason}&quot;</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
