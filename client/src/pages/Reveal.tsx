import { motion } from 'framer-motion';
import { useRoomStore } from '../store/useRoomStore';
import { socket } from '../socket';

export default function Reveal() {
  const { room, playerId } = useRoomStore();

  if (!room) return null;

  const isHost = room.hostId === playerId;
  const imposter = room.players.find((p) => p.role === 'imposter');
  const playingPlayers = room.players.filter((p) => p.isPlaying);

  // Tally votes
  const voteCounts: Record<string, number> = {};
  const voterNames: Record<string, string[]> = {};

  playingPlayers.forEach((p) => {
    if (p.votedForId) {
      voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
      voterNames[p.votedForId] = [...(voterNames[p.votedForId] || []), p.name];
    }
  });

  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const topIds = Object.keys(voteCounts).filter((id) => voteCounts[id] === maxVotes && maxVotes > 0);
  const votedOut = topIds.length === 1 ? room.players.find((p) => p.playerId === topIds[0]) : null;
  const crewmatesWon = votedOut?.playerId === imposter?.playerId;

  const crewmate = room.players.find((p) => p.isPlaying && p.role === 'crewmate');
  const realWord = crewmate?.footballer ?? '';

  const ranked = [...playingPlayers].sort(

    (a, b) => (voteCounts[b.playerId] || 0) - (voteCounts[a.playerId] || 0)
  );

  const handleRestart = () => socket.emit('restartGame', { roomCode: room.roomCode, playerId });

  return (
    <div className="w-full max-w-sm mx-auto space-y-4 pb-64">
      {/* Winner banner */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.45, duration: 0.7 }}
        className={`rounded-2xl py-5 text-center border-2 ${
          crewmatesWon
            ? 'border-neon/60 shadow-[0_0_30px_rgba(57,255,20,0.25)]'
            : 'border-red-500/60 shadow-[0_0_30px_rgba(239,68,68,0.25)]'
        }`}
        style={{ background: crewmatesWon ? 'rgba(57,255,20,0.08)' : 'rgba(239,68,68,0.08)' }}
      >
        <p className="text-3xl mb-1">{crewmatesWon ? '🏆' : '😈'}</p>
        <p
          className={`font-display text-4xl ${crewmatesWon ? 'neon-text' : 'text-red-500'}`}
          style={{
            letterSpacing: '0.1em',
            textShadow: crewmatesWon ? '0 0 20px rgba(57,255,20,0.8)' : '0 0 20px rgba(239,68,68,0.8)'
          }}
        >
          {crewmatesWon ? 'CREW WINS' : 'IMPOSTER WINS'}
        </p>
        <p className="text-xs text-gray-500 mt-2 font-semibold uppercase tracking-widest">
          {crewmatesWon ? 'Crewmates Win! 🎉' : 'Imposter Wins! 😈'}
        </p>

        <p className="text-xs text-gray-500 mt-2 font-semibold uppercase tracking-widest">
          The Imposter was {imposter?.name}
        </p>

        <p className="text-xs text-gray-500 mt-2 font-semibold uppercase tracking-widest">
          The real word was: {realWord}
        </p>

      </motion.div>

      {/* Imposter reveal */}
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4, type: 'spring' }}
        className="glass-panel rounded-2xl p-5 text-center border border-red-500/30"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">The Imposter Was</p>
        <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 flex items-center justify-center text-3xl font-black text-red-400 mx-auto mb-3">
          {imposter?.name?.charAt(0)?.toUpperCase()}
        </div>
        <p className="font-display text-3xl text-red-400 mb-1" style={{ letterSpacing: '0.1em' }}>
          {imposter?.name}
        </p>
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-1.5 mt-1">
          <span className="text-xs text-gray-500">Playing as</span>
          <span className="text-sm font-black text-red-300">{imposter?.footballer}</span>
        </div>

        <p className="text-xs text-gray-500 mt-3 font-semibold uppercase tracking-widest">
          The word was: {realWord}
        </p>

      </motion.div>

      {/* Vote breakdown */}
      {maxVotes > 0 && (
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/8">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Voting Results</p>
          </div>
          <div className="divide-y divide-white/5">
            {ranked
              .filter((p) => voteCounts[p.playerId] > 0)
              .map((p, i) => {
                const count = voteCounts[p.playerId] || 0;
                const pct = totalPct(count, playingPlayers.length);
                const isTop = topIds.includes(p.playerId);
                const isImposterPlayer = p.playerId === imposter?.playerId;

                return (
                  <div key={p.playerId} className="px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {i === 0 && <span className="text-sm">🎯</span>}
                        <span
                          className={`font-bold text-sm ${
                            isTop
                              ? isImposterPlayer
                                ? 'text-red-400'
                                : 'text-yellow-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {p.name}
                        </span>
                        {isImposterPlayer && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-black uppercase">
                            Imposter
                          </span>
                        )}
                      </div>
                      <span className="font-black text-sm text-gray-500">
                        {count} vote{count !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.5 }}
                        className={`h-full rounded-full ${isImposterPlayer ? 'bg-red-500' : 'bg-yellow-500'}`}
                      />
                    </div>

                    {voterNames[p.playerId] && (
                      <p className="text-[10px] text-gray-600 font-medium">{voterNames[p.playerId].join(', ')}</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Role breakdown */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">All Roles</p>
        </div>
        <div className="divide-y divide-white/5">
          {playingPlayers.map((p) => {
            const isMVP =
              (p.role !== 'imposter' && p.votedForId === imposter?.playerId && crewmatesWon) ||
              (p.role === 'imposter' && !crewmatesWon);
            const isImposterPlayer = p.role === 'imposter';
            const votedForName = playingPlayers.find((t) => t.playerId === p.votedForId)?.name;

            return (
              <div
                key={p.playerId}
                className={`flex items-center gap-3 px-4 py-3 ${isImposterPlayer ? 'bg-red-500/5' : ''}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0 ${
                    isImposterPlayer ? 'bg-red-500/20 text-red-400' : 'bg-white/8 text-black'
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm text-black truncate">{p.name}</span>
                    {isMVP && (
                      <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-black uppercase">
                        MVP
                      </span>
                    )}
                    {isImposterPlayer && (
                      <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded font-black uppercase">
                        Imposter
                      </span>
                    )}
                  </div>

                  <p
                    className={`text-xs font-semibold mt-0.5 ${
                      isImposterPlayer ? 'text-red-400/70' : 'text-neon/70'
                    }`}
                  >
                    {p.footballer}
                  </p>

                  {votedForName && (
                    <p className="text-[10px] text-gray-600 mt-0.5">Voted: {votedForName}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center py-2">
        <p className="text-xs text-gray-600 font-medium">Stats saved to leaderboard ✓</p>
      </div>

      {/* Bottom Action Bar */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
        style={{
          background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <div className="max-w-sm mx-auto grid grid-cols-2 gap-3 items-center">
          <a
            href="/leaderboard"
            className="h-12 rounded-xl font-bold text-sm uppercase tracking-widest text-yellow-400 border border-yellow-500/30 bg-yellow-500/10 flex items-center justify-center transition-all active:scale-95 cursor-pointer no-underline"
          >
            🏆 Rankings
          </a>
          {isHost ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRestart}
              className="h-12 rounded-xl font-black text-sm uppercase tracking-widest bg-neon text-black neon-glow transition-all cursor-pointer border-none"
            >
              ▶ Play Again
            </motion.button>
          ) : (
            <a
              href="/lobby"
              className="h-12 rounded-xl font-black text-sm uppercase tracking-widest bg-amber-400 text-black flex items-center justify-center transition-all active:scale-95 cursor-pointer no-underline"
              style={{ boxShadow: '0 4px 16px rgba(245,158,11,0.3)' }}
            >
              ◀ Back to Lobby
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function totalPct(votes: number, total: number) {
  if (total === 0) return 0;
  return Math.round((votes / total) * 100);
}

