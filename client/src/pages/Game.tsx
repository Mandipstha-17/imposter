import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '../store/useRoomStore';
import { socket } from '../socket';
import toast from 'react-hot-toast';

function RoleCard({ myPlayer, room }: { myPlayer: any, room: any }) {
  if (!myPlayer) return null;

  if (!myPlayer.isPlaying) {
    const imposter = room?.players?.find((p: any) => p.role === 'imposter');
    const crewmate = room?.players?.find((p: any) => p.role === 'crewmate' && p.footballer);

    return (
      <div className="card-elevated p-5 text-center" style={{ borderTop: '3px solid #0ea5e9' }}>
        <p className="section-label mb-1">Your Role</p>
        <p className="font-display text-4xl" style={{ color: '#0ea5e9', letterSpacing: '0.1em' }}>
          SPECTATOR
        </p>
        <p className="section-label mt-2">You are moderating this match</p>
        
        {imposter && crewmate && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(14,165,233,0.3)', textAlign: 'left' }}>
            <p className="mb-1 text-sm"><span className="font-bold text-red-500">Imposter:</span> {imposter.name}</p>
            <p className="text-sm"><span className="font-bold" style={{ color: 'var(--indigo)' }}>Secret Word:</span> {crewmate.footballer}</p>
          </div>
        )}
      </div>
    );
  }

  const isImposter = myPlayer.role === 'imposter';

  // Imposter card must reveal only: "You are the Imposter!" (no other words/clues)
  if (isImposter) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card-elevated p-5 text-center"
        style={{ borderTop: '3px solid var(--red)' }}
      >
        <p className="font-display text-3xl" style={{ color: 'var(--red)', letterSpacing: '0.06em' }}>
          You are the Imposter!
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="card-elevated p-5 text-center"
      style={{ borderTop: '3px solid var(--indigo)' }}
    >
      <p className="section-label mb-1">You are</p>
      <p className="font-display text-4xl" style={{ color: 'var(--indigo)', letterSpacing: '0.1em' }}>
        CREWMATE
      </p>

      <div
        className="mt-3 mx-auto inline-flex flex-col items-center px-5 py-3 rounded-2xl"
        style={{
          background: 'rgba(99,102,241,0.07)',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <p className="section-label">The footballer is</p>
        <p className="font-bold text-xl mt-1" style={{ color: 'var(--text-base)' }}>
          {myPlayer.footballer}
        </p>
      </div>
    </motion.div>
  );
}

function DiscussionPhase({
  room,
  players,
  isHost,
  onStartVoting,
  myPlayer,
  onSubmitDescription,
}: {
  room: any;
  players: any[];
  isHost: boolean;
  onStartVoting: () => void;
  myPlayer: any;
  onSubmitDescription: (text: string) => void;
}) {
  const [myText, setMyText] = useState('');

  const turnOrder: string[] = room?.turnOrder ?? players.map((p: any) => p.playerId);
  const currentTurnIndex: number = room?.currentTurnIndex ?? 0;
  const currentTurnPlayerId: string | undefined = turnOrder[currentTurnIndex];
  const isMyTurn = myPlayer?.isPlaying && currentTurnPlayerId === myPlayer?.playerId;
  const hasSubmittedMyClue = !!myPlayer?.description?.trim();
  const allDone = currentTurnIndex >= turnOrder.length;

  // Find the player whose turn it is
  const activePlayer = players.find((p: any) => p.playerId === currentTurnPlayerId);


  return (
    <div className="space-y-4 pb-32">
      {/* My turn input */}
      {myPlayer?.isPlaying && isMyTurn && !hasSubmittedMyClue && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="card-elevated p-4 space-y-3"
          style={{ borderLeft: '3px solid var(--indigo)' }}
        >
          <p className="section-label font-bold" style={{ color: 'var(--indigo)' }}>
            ✍️ Your Turn — Write Your Clue
          </p>
          <textarea
            value={myText}
            onChange={(e) => setMyText(e.target.value)}
            maxLength={200}
            rows={3}
            autoFocus
            className="w-full rounded-xl p-3 text-sm"
            style={{
              background: 'rgba(255,255,255,0.6)',
              border: '1.5px solid rgba(99,102,241,0.3)',
              color: 'var(--text-base)',
              resize: 'none',
              outline: 'none',
            }}
            placeholder={
              myPlayer.role === 'imposter'
                ? "Invent a cover clue so you aren't suspected..."
                : "Describe your footballer without giving away the exact name..."
            }
          />
          <div className="flex justify-between items-center text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{myText.length}/200 characters</span>
            <button
              onClick={() => {
                onSubmitDescription(myText);
                setMyText('');
              }}
              disabled={!myText.trim()}
              className="h-9 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white cursor-pointer"
              style={{
                background: 'var(--indigo)',
                boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
                border: 'none',
              }}
            >
              Submit Clue
            </button>
          </div>
        </motion.div>
      )}

      {/* Turn status indicator */}
      <AnimatePresence mode="wait">
        {!allDone && myPlayer?.isPlaying && !isMyTurn && (
          <motion.div
            key={`waiting-${currentTurnPlayerId}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-panel px-4 py-3 flex items-center gap-3"
            style={{ borderLeft: '3px solid var(--yellow)' }}
          >
            <span className="text-xl animate-pulse">⏳</span>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>
                Waiting for <span style={{ color: 'var(--indigo)' }}>{activePlayer?.name ?? '...'}</span>
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>They are writing their clue now...</p>
            </div>
          </motion.div>
        )}

        {allDone && (
          <motion.div
            key="all-done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel px-4 py-3 text-center"
            style={{ borderLeft: '3px solid var(--emerald)' }}
          >
            <p className="font-bold text-sm" style={{ color: 'var(--emerald)' }}>
              ✅ All clues submitted for Round {room?.currentRound}!
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {(room?.currentRound ?? 1) < (room?.totalRounds ?? 3)
                ? 'Next round starting soon...'
                : isHost ? 'All rounds done — tap Start Voting!' : 'Waiting for host to start voting...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live clue board — current round */}
      <div className="glass-panel overflow-hidden">
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(203,213,225,0.5)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <p className="section-label">Round {room?.currentRound} — Live Clues</p>
          </div>
          <span className="section-label">
            {players.filter((p: any) => !!p.description?.trim()).length}/{players.length}
          </span>
        </div>

        {turnOrder.map((pid: string, i: number) => {
          const p = players.find((pl: any) => pl.playerId === pid);
          if (!p) return null;
          const isSelf = p.playerId === myPlayer?.playerId;
          const hasClue = !!p.description?.trim();
          const isActiveTurn = pid === currentTurnPlayerId && !allDone;

          return (
            <motion.div
              key={p.playerId}
              layout
              className="px-4 py-3.5 space-y-2"
              style={{
                borderBottom: i < turnOrder.length - 1 ? '1px solid rgba(203,213,225,0.3)' : 'none',
                background: isActiveTurn ? 'rgba(99,102,241,0.04)' : 'transparent',
                transition: 'background 0.3s',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: isActiveTurn ? 'rgba(99,102,241,0.2)' : isSelf ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.07)',
                      border: isActiveTurn ? '2px solid rgba(99,102,241,0.5)' : isSelf ? '1.5px solid rgba(99,102,241,0.3)' : '1.5px solid rgba(99,102,241,0.12)',
                      color: 'var(--indigo)',
                      boxShadow: isActiveTurn ? '0 0 0 4px rgba(99,102,241,0.1)' : 'none',
                    }}
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>
                      {p.name} {isSelf && <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>(You)</span>}
                    </span>
                    {isActiveTurn && (
                      <p className="text-[10px] font-bold mt-0.5" style={{ color: 'var(--indigo)' }}>✏️ Writing now...</p>
                    )}
                  </div>
                </div>
                {hasClue ? (
                  <span className="badge badge-emerald text-[10px] uppercase font-bold tracking-wider">✓ Done</span>
                ) : isActiveTurn ? (
                  <span className="badge badge-gray text-[10px] uppercase font-bold tracking-wider animate-pulse">Active</span>
                ) : (
                  <span className="badge badge-gray text-[10px] uppercase font-bold tracking-wider" style={{ opacity: 0.35 }}>Waiting</span>
                )}
              </div>

              <div className="pl-12">
                {hasClue ? (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm rounded-xl p-3"
                    style={{
                      background: 'rgba(255,255,255,0.65)',
                      border: '1px solid rgba(99,102,241,0.15)',
                      color: 'var(--text-base)',
                    }}
                  >
                    "{p.description}"
                  </motion.div>
                ) : isActiveTurn ? (
                  <div className="text-xs italic flex items-center gap-2" style={{ color: 'var(--indigo)' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping shrink-0" />
                    Typing their clue...
                  </div>
                ) : (
                  <div className="text-xs italic" style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
                    Waiting for their turn...
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Past rounds clue history */}
      {room?.roundDescriptions && room.roundDescriptions.filter((rd: any) => rd.roundNumber !== room.currentRound).length > 0 && (
        <div className="space-y-3">
          <p className="section-label px-1">📋 Previous Rounds</p>
          {room.roundDescriptions
            .filter((rd: any) => rd.roundNumber !== room.currentRound)
            .map((rd: any) => (
              <div key={rd.roundNumber} className="glass-panel overflow-hidden">
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{ borderBottom: '1px solid rgba(203,213,225,0.4)', background: 'rgba(99,102,241,0.03)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--indigo)' }}>Round {rd.roundNumber}</p>
                  <span className="section-label text-xs">{rd.entries.length} clues</span>
                </div>
                <div>
                  {rd.entries.map((entry: any, idx: number) => (
                    <div
                      key={entry.playerId}
                      className="px-4 py-2.5"
                      style={{ borderBottom: idx < rd.entries.length - 1 ? '1px solid rgba(203,213,225,0.25)' : 'none' }}
                    >
                      <span className="font-semibold text-xs" style={{ color: 'var(--text-base)' }}>{entry.name}:</span>
                      <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-muted)' }}>"{entry.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Host: start voting button — only shown after all rounds done */}
      {isHost && allDone && (room?.currentRound ?? 1) >= (room?.totalRounds ?? 3) && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
          style={{
            background: 'linear-gradient(to top, rgba(240,242,255,0.95) 65%, rgba(240,242,255,0))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-md md:max-w-2xl mx-auto">
            <motion.button
              whileTap={{ scale: 0.97 }}
              animate={{ boxShadow: ['0 4px 18px rgba(245,158,11,0.3)', '0 4px 28px rgba(245,158,11,0.6)', '0 4px 18px rgba(245,158,11,0.3)'] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
              onClick={onStartVoting}
              className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-white"
              style={{ background: 'var(--yellow)', border: 'none' }}
            >
              🗳 Start Voting
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoundSummary({ room, isHost }: { room: any; isHost: boolean; playerId: string | null; onReveal: () => void }) {
  const playingPlayers = room?.players?.filter((p: any) => p.isPlaying) ?? [];
  const roundDescriptions = room?.roundDescriptions ?? [];
  const totalRounds = room?.totalRounds ?? roundDescriptions.length ?? 1;

  return (
    <div className="space-y-4 pb-32">
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card-elevated p-5 text-center"
        style={{ borderTop: '3px solid var(--indigo)' }}
      >
        <p className="font-display text-3xl" style={{ letterSpacing: '0.08em' }}>
          All Rounds Complete — Discussion Results
        </p>
        <p className="section-label mt-1">Review what everyone typed, then start voting</p>
      </motion.div>

      <div className="space-y-3">
        {Array.from({ length: totalRounds }).map((_, idx) => {
          const roundNumber = idx + 1;
          const roundBox = roundDescriptions.find((r: any) => r.roundNumber === roundNumber);
          const entries = roundBox?.entries ?? [];

          return (
            <div key={roundNumber} className="glass-panel overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(203,213,225,0.5)' }}>
                <p className="section-label">Round {roundNumber}</p>
                <span className="section-label">{entries.length} entries</span>
              </div>

              <div className="divide-y divide-white/5">
                {playingPlayers.map((p: any) => {
                  const entry = entries.find((d: any) => d.playerId === p.playerId);
                  return (
                    <div key={p.playerId} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="font-semibold" style={{ color: 'var(--text-base)' }}>{p.name}</div>
                      </div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {(entry?.text ?? '').trim() ? entry.text : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {isHost && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
          style={{
            background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-md md:max-w-2xl mx-auto space-y-2">
            <p className="section-label text-center">Start Voting</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', textAlign: 'center' }}>
              When you’re ready, voting will begin for everyone.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}


function VotingPhase({ room, myPlayer, onVote, onReveal }: any) {



  const votingDurationSec = room?.votingDuration ?? 240;
  const [timeLeft, setTimeLeft] = useState(votingDurationSec);
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
          votingDurationSec -
            Math.floor((Date.now() - new Date(room.votingStartedAt).getTime()) / 1000)
        )
      );
    }, 500);
    return () => clearInterval(iv);
  }, [room.votingStartedAt, votingDurationSec]);

  return (
    <div className="space-y-4 pb-32">
      <AnimatePresence mode="wait">
        {isTie ? (
          <motion.div
            key="tie"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card-elevated p-5 text-center"
            style={{ borderTop: '3px solid var(--red)' }}
          >
            <p className="font-display text-3xl" style={{ color: 'var(--red)', letterSpacing: '0.08em' }}>
              TIE BREAKER!
            </p>
            <p className="section-label mt-1">Vote only for the tied players below</p>
          </motion.div>
        ) : (
          <motion.div
            key="vote"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-panel p-4 flex justify-between items-center"
          >
            <div>
              <p className="section-label mb-0.5">Voting Phase</p>
              <p className="font-bold text-sm" style={{ color: 'var(--text-base)' }}>
                {votedCount} / {totalVoters} voted
              </p>
            </div>
            <div
              className="font-display text-3xl"
              style={{ color: timeLeft <= 10 ? 'var(--red)' : 'var(--indigo)', letterSpacing: '0.05em' }}
            >
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
                  style={{
                    background: 'rgba(99,102,241,0.08)',
                    border: '1.5px solid rgba(99,102,241,0.15)',
                    color: 'var(--indigo)',
                  }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-base)' }}>
                    {p.name}
                  </p>
                  {p.hasVoted && (
                    <p className="text-[10px] font-bold" style={{ color: 'var(--emerald)' }}>
                      ✓ Voted
                    </p>
                  )}
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

      {/* Clues History */}
      {room.roundDescriptions && room.roundDescriptions.length > 0 && (
        <div className="space-y-3 mt-4">
          <p className="section-label px-1">Clues History</p>
          {room.roundDescriptions.map((rd: any) => (
            <div key={rd.roundNumber} className="glass-panel overflow-hidden">
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(203,213,225,0.5)', background: 'rgba(99,102,241,0.03)' }}>
                <p className="section-label text-xs font-bold text-indigo-600">Round {rd.roundNumber}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {rd.entries.map((entry: any) => (
                  <div key={entry.playerId} className="px-4 py-2.5">
                    <span className="font-bold text-xs" style={{ color: 'var(--text-base)' }}>{entry.name}:</span>
                    <span className="text-xs text-muted block mt-0.5">&ldquo;{entry.text}&rdquo;</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {isHost && room?.status === 'voting_complete' && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
          style={{
            background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-md md:max-w-2xl mx-auto">
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
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Results are sealed. Only the host can reveal the imposter now.
        </p>
      </div>

      {isHost && (
        <div
          className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
          style={{
            background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}
        >
          <div className="max-w-md md:max-w-2xl mx-auto space-y-2">
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

  const handleStartVoting = useCallback(() => {
    socket.emit('start_voting', { roomCode: room?.roomCode, playerId });
  }, [room?.roomCode, playerId]);

  const handleSubmitDescription = useCallback(
    (text: string) => {
      socket.emit('submit_description', { roomCode: room?.roomCode, playerId, text }, (res: any) => {
        if (!res?.success) toast.error('Failed to submit description');
      });
    },
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
    <div className="w-full max-w-md md:max-w-2xl mx-auto space-y-4">
      {/* Round & Room Info Header */}
      <div className="flex items-center justify-between px-1 text-xs font-semibold animate-fade-in" style={{ color: 'var(--text-muted)' }}>
        <span>Room: <b style={{ color: 'var(--indigo)' }}>{room.roomCode}</b></span>
        <span>Round <b style={{ color: 'var(--indigo)' }}>{room.currentRound}</b> of <b style={{ color: 'var(--indigo)' }}>{room.totalRounds || 3}</b></span>
      </div>

      {isHost && (
        <div className="flex justify-end px-1 animate-fade-in">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to abort the current match and return everyone to the lobby?')) {
                socket.emit('restartGame', { roomCode: room.roomCode, playerId });
              }
            }}
            className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-500 border border-red-500/20 active:scale-95 transition-all cursor-pointer"
          >
            🛑 Abort Match
          </button>
        </div>
      )}

      <RoleCard myPlayer={myPlayer} room={room} />

      <AnimatePresence mode="wait">
        {room.status === 'discussion' && (
          <motion.div key="disc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <DiscussionPhase
              room={room}
              players={playingPlayers}
              isHost={!!isHost}
              onStartVoting={handleStartVoting}
              myPlayer={myPlayer}
              onSubmitDescription={handleSubmitDescription}
            />
          </motion.div>
        )}

        {room.status === 'round_summary' && (
          <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <RoundSummary room={room} isHost={!!isHost} playerId={playerId} onReveal={handleReveal} />
          </motion.div>
        )}

        {room.status === 'revealed' && (() => {

          const imposter = room.players.find((p: any) => p.role === 'imposter');
          const imposterId = imposter?.playerId;

          // Determine who won by comparing the voted-out player with the imposter.
          const votedOutPlayerId = (() => {
            const voteCounts: Record<string, number> = {};
            room.players
              .filter((p: any) => p.isPlaying && p.votedForId)
              .forEach((p: any) => {
                voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
              });

            const maxVotes = Math.max(0, ...Object.values(voteCounts));
            const topIds = Object.keys(voteCounts).filter(
              (id) => voteCounts[id] === maxVotes && maxVotes > 0
            );
            return topIds.length === 1 ? topIds[0] : null;
          })();

          const crewmatesWon = votedOutPlayerId === imposterId;
          const youAreImposter = myPlayer?.role === 'imposter';
          const crewmate = room.players.find((p: any) => p.isPlaying && p.role === 'crewmate');
          const realWord = crewmate?.footballer || '';


          return (
            <motion.div key="revealed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass-panel p-4 text-center" style={{ borderLeft: '3px solid var(--red)' }}>
                <p className="font-display text-3xl" style={{ color: crewmatesWon ? 'var(--indigo)' : 'var(--red)' }}>
                  {crewmatesWon ? 'Crewmates Win! 🎉' : 'Imposter Wins! 😈'}
                </p>

                <p className="section-label mt-2" style={{ color: 'var(--text-base)' }}>
                  The Imposter was <b>{imposter?.name || '—'}</b>!
                </p>

                <div className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {youAreImposter ? (
                    <div>
                      <b style={{ color: 'var(--red)' }}>The word was {realWord || '—'}</b>
                    </div>
                  ) : (
                    <div>
                      <b style={{ color: 'var(--indigo)' }}>What the real word was: {realWord || '—'}</b>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}


        {(room.status === 'voting' || room.status === 'tie_breaker') && (


          <motion.div key="vote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <VotingPhase room={room} myPlayer={myPlayer} onVote={handleVote} onReveal={handleReveal} />
          </motion.div>
        )}

      {room.status === 'voting_complete' && (
        <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
          <VotingComplete isHost={!!isHost} onReveal={handleReveal} />
        </motion.div>
      )}

      {room.status === 'revealed' && (
        <motion.div>
          <div
            className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-3 z-40"
            style={{
              background: 'linear-gradient(to top, rgba(240, 242, 255, 0.9) 65%, rgba(240, 242, 255, 0))',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <div className="max-w-md md:max-w-2xl mx-auto">
              {isHost ? (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => socket.emit('restartGame', { roomCode: room?.roomCode, playerId })}
                  className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-white"
                  style={{ background: 'var(--yellow)', boxShadow: '0 4px 18px rgba(245,158,11,0.4)', border: 'none' }}
                >
                  ▶ New Game
                </motion.button>
              ) : (
                <a
                  href="/lobby"
                  className="w-full h-14 rounded-2xl font-black text-base uppercase tracking-widest text-black flex items-center justify-center cursor-pointer"
                  style={{ background: 'var(--yellow)', boxShadow: '0 4px 18px rgba(245,158,11,0.4)' }}
                >
                  ◀ Back to Lobby
                </a>
              )}
            </div>
          </div>
        </motion.div>
      )}


      </AnimatePresence>
    </div>
  );
}

