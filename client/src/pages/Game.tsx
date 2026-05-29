import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '../store/useRoomStore';
import { socket } from '../socket';
import toast from 'react-hot-toast';

function RoleCard({ myPlayer }: { myPlayer: any }) {
  if (!myPlayer) return null;

  if (!myPlayer.isPlaying) {
    return (
      <div className="card-elevated p-5 text-center" style={{ borderTop: '3px solid #0ea5e9' }}>
        <p className="section-label mb-1">Your Role</p>
        <p className="font-display text-4xl" style={{ color: '#0ea5e9', letterSpacing: '0.1em' }}>
          SPECTATOR
        </p>
        <p className="section-label mt-2">You are moderating this match</p>
      </div>
    );
  }

  const isImposter = myPlayer.role === 'imposter';
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card-elevated p-5 text-center"
      style={{ borderTop: `3px solid ${isImposter ? 'var(--red)' : 'var(--indigo)'}` }}
    >
      <p className="section-label mb-1">You are</p>
      <p
        className="font-display text-4xl"
        style={{ color: isImposter ? 'var(--red)' : 'var(--indigo)', letterSpacing: '0.1em' }}
      >
        {isImposter ? 'IMPOSTER' : 'CREWMATE'}
      </p>

      <div
        className="mt-3 mx-auto inline-flex flex-col items-center px-5 py-3 rounded-2xl"
        style={{
          background: isImposter ? 'rgba(239,68,68,0.07)' : 'rgba(99,102,241,0.07)',
          border: `1px solid ${isImposter ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)'}`,
        }}
      >
        <p className="section-label">{isImposter ? 'Your cover story' : 'The footballer is'}</p>
        <p className="font-bold text-xl mt-1" style={{ color: 'var(--text-base)' }}>
          {myPlayer.footballer}
        </p>
      </div>

      {isImposter && <p className="section-label mt-3">🤫 Blend in — nobody knows your secret</p>}
    </motion.div>
  );
}

function DiscussionPhase({ players, isHost, onStartVoting }: any) {
  return (
    <div className="space-y-4">
      <div className="glass-panel overflow-hidden">
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(203,213,225,0.5)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="section-label">Discussion Phase</p>
          </div>
          <span className="section-label">{players.length} players</span>
        </div>

        {players.map((p: any, i: number) => (
          <div
            key={p.playerId}
            className="flex items-center gap-3 px-4 py-3.5"
            style={{ borderBottom: i < players.length - 1 ? '1px solid rgba(203,213,225,0.35)' : 'none' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.15)', color: 'var(--indigo)' }}
            >
              {p.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>
              {p.name}
            </span>
          </div>
        ))}
      </div>

      <div className="glass-panel p-4" style={{ borderLeft: '3px solid var(--yellow)' }}>
        <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-base)' }}>💬 Discuss with your group</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Share clues, debate, and figure out who the imposter is. The host will start voting when ready.
        </p>
      </div>

      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40" style={{ background: 'linear-gradient(to top, rgba(240,242,255,1) 55%, transparent)' }}>
          <div className="max-w-sm mx-auto">
            <motion.button whileTap={{ scale: 0.97 }} onClick={onStartVoting} className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-white" style={{ background: 'var(--yellow)', boxShadow: '0 4px 18px rgba(245,158,11,0.4)' }}>
              🗳 Start Voting
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

function VotingPhase({ room, myPlayer, onVote, onReveal }: any) {
  const [timeLeft, setTimeLeft] = useState(60);
  const isTie = room.status === 'tie_breaker';
  const isHost = room.hostId === myPlayer?.playerId;

  const targets = isTie
    ? room.players.filter((p: any) => p.isPlaying && room.tiedPlayerIds.includes(p.playerId))
    : room.players.filter((p: any) => p.isPlaying);

  const votedCount = room.players.filter((p: any) => p.isPlaying && p.hasVoted).length;
  const totalVoters = room.players.filter((p: any) => p.isPlaying).length;

  useEffect(() => {
    if (!room.votingStartedAt) return;
    const iv = setInterval(() => {
      setTimeLeft(
        Math.max(
          0,
          60 - Math.floor((Date.now() - new Date(room.votingStartedAt).getTime()) / 1000)
        )
      );
    }, 500);
    return () => clearInterval(iv);
  }, [room.votingStartedAt]);

  return (
    <div className="space-y-4 pb-32">
      <AnimatePresence mode="wait">
        {isTie ? (
          <motion.div key="tie" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-elevated p-5 text-center" style={{ borderTop: '3px solid var(--red)' }}>
            <p className="font-display text-3xl" style={{ color: 'var(--red)', letterSpacing: '0.08em' }}>TIE BREAKER!</p>
            <p className="section-label mt-1">Vote only for the tied players below</p>
          </motion.div>
        ) : (
          <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4 flex justify-between items-center">
            <div>
              <p className="section-label mb-0.5">Voting Phase</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>
                {votedCount} / {totalVoters} voted
              </p>
            </div>
            <div className="font-display text-3xl" style={{ color: timeLeft <= 10 ? 'var(--red)' : 'var(--indigo)', letterSpacing: '0.05em' }}>
              {timeLeft}s
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(203,213,225,0.6)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--indigo)' }}
          animate={{ width: `${totalVoters > 0 ? (votedCount / totalVoters) * 100 : 0}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {myPlayer?.isPlaying && (
        <div
          className="glass-panel px-4 py-2.5 text-center text-xs font-semibold"
          style={{
            color: myPlayer.hasVoted ? 'var(--emerald)' : 'var(--text-muted)',
            borderLeft: `3px solid ${myPlayer.hasVoted ? 'var(--emerald)' : 'rgba(203,213,225,0.6)'}`,
          }}
        >
          {myPlayer.hasVoted ? '✓ Vote submitted — waiting for others' : 'Tap a player to vote them out'}
        </div>
      )}

      <div className="space-y-2">
        {targets.map((p: any) => {
          const canVote = myPlayer?.isPlaying && !myPlayer.hasVoted && p.playerId !== myPlayer?.playerId;
          return (
            <motion.div
              key={p.playerId}
              layout
              className="glass-panel px-4 py-3.5 flex items-center justify-between"
              style={{ borderLeft: isTie ? '3px solid var(--red)' : undefined }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1.5px solid rgba(99,102,241,0.15)', color: 'var(--indigo)' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>
                    {p.name}
                  </p>
                  {p.hasVoted && <p className="text-[10px] font-bold" style={{ color: 'var(--emerald)' }}>✓ Voted</p>}
                </div>
              </div>

              {canVote && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onVote(p.playerId)}
                  className="h-8 px-4 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-all"
                  style={{ background: 'var(--red)', boxShadow: '0 2px 10px rgba(239,68,68,0.3)' }}
                >
                  Vote
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>

      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40" style={{ background: 'linear-gradient(to top, rgba(240,242,255,1) 55%, transparent)' }}>
          <div className="max-w-sm mx-auto">
            <p className="section-label text-center mb-2">Host Controls</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onReveal}
              className="w-full h-12 rounded-xl font-black text-sm uppercase tracking-widest text-white"
              style={{ background: 'var(--red)' }}
            >
              🔴 Force Reveal
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

function VotingComplete({ isHost, onReveal }: any) {
  return (
    <div className="flex flex-col items-center gap-5 pt-8 pb-32">
      <motion.div
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="w-20 h-20 rounded-full flex items-center justify-center text-3xl"
        style={{ background: 'rgba(99,102,241,0.08)', border: '2px solid rgba(99,102,241,0.25)', boxShadow: '0 4px 20px rgba(99,102,241,0.2)' }}
      >
        🔒
      </motion.div>
      <div className="text-center">
        <p className="font-display text-3xl" style={{ color: 'var(--text-base)', letterSpacing: '0.08em' }}>
          ALL VOTES IN
        </p>
        <p className="section-label mt-1">Waiting for host reveal…</p>
      </div>
      <div className="glass-panel p-4 text-center w-full">
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Results are sealed. Only the host can reveal the imposter now.</p>
      </div>

      {isHost && (
        <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40" style={{ background: 'linear-gradient(to top, rgba(240,242,255,1) 55%, transparent)' }}>
          <div className="max-w-sm mx-auto space-y-2">
            <p className="section-label text-center">The moment everyone&apos;s been waiting for…</p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: ['0 4px 16px rgba(239,68,68,0.3)', '0 4px 28px rgba(239,68,68,0.6)', '0 4px 16px rgba(239,68,68,0.3)'] }}
              transition={{ repeat: Infinity, duration: 1.6 }}
              onClick={onReveal}
              className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-white"
              style={{ background: 'var(--red)' }}
            >
              🔴 Reveal Imposter
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Game() {
  const { room, playerId } = useRoomStore();
  const myPlayer = room?.players.find((p) => p.playerId === playerId);
  const isHost = room?.hostId === playerId;
  const playingPlayers = room?.players.filter((p) => p.isPlaying) ?? [];

  useEffect(() => {
    const onTie = () => toast.error('🔥 TIE! A revote is required');
    const onDone = () => toast.success('All votes submitted!');
    socket.on('tie_breaker_started', onTie);
    socket.on('voting_completed', onDone);
    return () => {
      socket.off('tie_breaker_started', onTie);
      socket.off('voting_completed', onDone);
    };
  }, []);

  const handleStartVoting = useCallback(
    () => socket.emit('start_voting', { roomCode: room?.roomCode, playerId }),
    [room?.roomCode, playerId]
  );

  const handleVote = useCallback(
    (targetId: string) => {
      socket.emit('cast_vote', { roomCode: room?.roomCode, playerId, targetId }, (res: any) => {
        if (!res?.success) toast.error(res?.message || 'Vote failed');
      });
    },
    [room?.roomCode, playerId]
  );

  const handleReveal = useCallback(() => {
    socket.emit('revealImposter', { roomCode: room?.roomCode, playerId }, (res: any) => {
      if (!res?.success) toast.error(res?.message || 'Failed to reveal');
    });
  }, [room?.roomCode, playerId]);

  if (!room) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--indigo)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto space-y-4">
      <RoleCard myPlayer={myPlayer} />

      <AnimatePresence mode="wait">
        {room.status === 'discussion' && (
          <motion.div key="disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DiscussionPhase players={playingPlayers} isHost={isHost} onStartVoting={handleStartVoting} />
          </motion.div>
        )}

        {(room.status === 'voting' || room.status === 'tie_breaker') && (
          <motion.div key="vote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <VotingPhase room={room} myPlayer={myPlayer} onVote={handleVote} onReveal={handleReveal} />
          </motion.div>
        )}

        {room.status === 'voting_complete' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <VotingComplete isHost={isHost} onReveal={handleReveal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

