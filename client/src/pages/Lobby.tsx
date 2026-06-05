import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRoomStore } from '../store/useRoomStore';
import { socket } from '../socket';

export default function Lobby() {
  const { room, playerId } = useRoomStore();
  const [rounds, setRounds] = useState(3);

  if (!room) return (
    <div className="flex flex-col items-center gap-4 pt-24">
      <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--indigo)', borderTopColor: 'transparent' }} />
      <p className="section-label">Connecting…</p>
    </div>
  );

  const isHost = room.hostId === playerId;
  const myPlayer = room.players.find(p => p.playerId === playerId);
  const playingCount = room.players.filter(p => p.isPlaying).length;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.roomCode || '');
    toast.success('Code copied!');
  };

  const handleToggleMode = (isPlaying: boolean) => {
    socket.emit('toggle_host_mode', { roomCode: room.roomCode, playerId, isPlaying });
  };

  const handleRoundsChange = (val: number) => {
    const clamped = Math.max(1, Math.min(10, val));
    setRounds(clamped);
    socket.emit('set_rounds', { roomCode: room.roomCode, playerId, totalRounds: clamped });
  };

  const handleStart = () => {
    if (playingCount < 1) return toast.error('Need at least 1 active player');
    socket.emit('startGame', { roomCode: room.roomCode, playerId });
  };

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto flex flex-col gap-4 pb-32">

      {/* Room code */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card-elevated p-5">
        <p className="section-label mb-2">Room Code</p>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-display text-5xl" style={{ color: 'var(--indigo)', letterSpacing: '0.2em' }}>
              {room.roomCode}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="section-label">{room.players.length} joined · {playingCount} playing</span>
            </div>
          </div>
          <button onClick={handleCopyCode}
            className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 shrink-0"
            style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--indigo)', border: '1px solid rgba(99,102,241,0.2)' }}>
            📋 Copy
          </button>
        </div>
      </motion.div>

      {/* Host controls */}
      {isHost && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-panel p-4 space-y-4">

          {/* Mode toggle */}
          <div className="space-y-2">
            <p className="section-label">Your Mode</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleToggleMode(true)}
                className="h-11 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                style={myPlayer?.isPlaying
                  ? { background: 'var(--indigo)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(99,102,241,0.35)' }
                  : { background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)', border: '1.5px solid rgba(203,213,225,0.8)' }}>
                ⚽ Play & Host
              </button>
              <button onClick={() => handleToggleMode(false)}
                className="h-11 rounded-xl text-sm font-bold uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                style={!myPlayer?.isPlaying
                  ? { background: '#0ea5e9', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(14,165,233,0.35)' }
                  : { background: 'rgba(255,255,255,0.6)', color: 'var(--text-muted)', border: '1.5px solid rgba(203,213,225,0.8)' }}>
                👁 Spectator
              </button>
            </div>
          </div>

          {/* Rounds picker */}
          <div className="space-y-2">
            <p className="section-label">Number of Rounds</p>
            <div className="flex items-center gap-3">
              <button onClick={() => handleRoundsChange(rounds - 1)}
                className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--indigo)', border: '1px solid rgba(99,102,241,0.2)' }}>
                −
              </button>
              <div className="flex-1 h-12 rounded-xl flex items-center justify-center font-black text-2xl"
                style={{ background: 'rgba(99,102,241,0.07)', color: 'var(--indigo)', border: '1px solid rgba(99,102,241,0.15)' }}>
                {rounds}
              </div>
              <button onClick={() => handleRoundsChange(rounds + 1)}
                className="w-10 h-10 rounded-xl font-black text-lg flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--indigo)', border: '1px solid rgba(99,102,241,0.2)' }}>
                ＋
              </button>
            </div>
            <p className="section-label text-center">Each round: 1 new footballer, 1 new imposter</p>
          </div>
        </motion.div>
      )}

      {/* Players list */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="glass-panel overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center"
          style={{ borderBottom: '1px solid rgba(203,213,225,0.5)' }}>
          <p className="section-label">Players</p>
          <span className="section-label font-black">{room.players.length}</span>
        </div>
        <AnimatePresence>
          {room.players.map((p, i) => (
            <motion.div key={p.playerId}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between px-4 py-3.5"
              style={{ borderBottom: i < room.players.length - 1 ? '1px solid rgba(203,213,225,0.35)' : 'none' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{
                    background: p.isHost ? 'rgba(245,158,11,0.12)' : 'rgba(99,102,241,0.08)',
                    border: p.isHost ? '1.5px solid rgba(245,158,11,0.3)' : '1.5px solid rgba(99,102,241,0.15)',
                    color: p.isHost ? '#d97706' : 'var(--indigo)',
                  }}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-semibold text-sm" style={{ color: p.isPlaying ? 'var(--text-base)' : 'var(--text-faint)' }}>
                  {p.name}
                </span>
              </div>
              <div className="flex gap-1.5">
                {p.isHost && <span className="badge badge-yellow">Host</span>}
                {!p.isPlaying && <span className="badge badge-gray">Spec</span>}
                {p.isPlaying && !p.isHost && <span className="badge badge-indigo">Player</span>}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Waiting dots for non-host */}
      {!isHost && (
        <div className="flex flex-col items-center gap-3 py-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: 'var(--indigo)' }}
                animate={{ opacity: [0.2, 1, 0.2] }}
                transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.3 }} />
            ))}
          </div>
          <p className="section-label">Waiting for host to start the match</p>
        </div>
      )}

      {/* Sticky start */}
      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
          style={{
            background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
          <div className="max-w-md md:max-w-2xl mx-auto">
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleStart}
              className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-white animate-pulse-indigo"
              style={{ background: 'var(--indigo)', boxShadow: '0 4px 18px rgba(99,102,241,0.4)', border: 'none' }}>
              🚀 Start Match
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
