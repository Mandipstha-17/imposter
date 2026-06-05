import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getServerUrl } from '../config';

interface PlayerStats {
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentWinStreak: number;
  highestWinStreak: number;
  imposterWins: number;
  crewmateWins: number;
  mvpCount: number;
}

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'wins' | 'streak' | 'mvp'>('wins');

  useEffect(() => {
    const url = getServerUrl() + '/api/leaderboard';
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setLeaders(d.leaderboard);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sorted = [...leaders].sort((a, b) => {
    if (tab === 'streak') return b.highestWinStreak - a.highestWinStreak;
    if (tab === 'mvp') return b.mvpCount - a.mvpCount;
    return b.wins - a.wins;
  });

  const top3 = sorted.slice(0, 3);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 pt-20">
        <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Loading rankings...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <p className="text-4xl">🏆</p>
        <h1 className="font-display text-4xl text-black" style={{ letterSpacing: '0.15em' }}>
          RANKINGS
        </h1>
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Global Leaderboard</p>
      </div>

      {/* Category tabs */}
      <div className="grid grid-cols-3 glass-panel rounded-2xl overflow-hidden p-1 gap-1">
        {([['wins', '🏅 Wins'], ['streak', '🔥 Streak'], ['mvp', '⭐ MVP']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              tab === key
                ? 'bg-neon/10 text-neon border border-neon/30'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>


      {leaders.length === 0 ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🎮</p>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No games played yet</p>
          <p className="text-xs text-gray-600 mt-1">Complete a match to appear here!</p>
          <a href="/" className="mt-4 inline-block bg-neon/10 text-neon border border-neon/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest">
            Play Now →
          </a>
        </div>
      ) : (
        <>
          {/* Podium */}
          {top3.length > 0 && (
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 text-center">Top Players</p>
              <div className="flex items-end justify-center gap-2 h-32">
                {top3[1] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: '70%', opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex-1 max-w-[90px] flex flex-col items-center justify-start pt-3 rounded-t-xl border border-gray-500/30"
                    style={{ background: 'rgba(156,163,175,0.08)', height: '70%' }}
                  >
                    <span className="text-xl">🥈</span>
                    <p className="text-[10px] font-black text-gray-300 mt-1 text-center px-1 truncate w-full">{top3[1].displayName}</p>
                    <p className="text-xs font-bold text-gray-400">
                      {tab === 'wins' ? top3[1].wins : tab === 'streak' ? top3[1].highestWinStreak : top3[1].mvpCount}
                    </p>
                  </motion.div>
                )}

                {top3[0] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: '100%', opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex-1 max-w-[100px] flex flex-col items-center justify-start pt-3 rounded-t-xl border-2 border-yellow-500/50"
                    style={{ background: 'rgba(234,179,8,0.08)', boxShadow: '0 0 20px rgba(234,179,8,0.2)' }}
                  >
                    <span className="text-2xl animate-float inline-block">👑</span>
                    <p className="text-[10px] font-black text-yellow-400 mt-1 text-center px-1 truncate w-full">{top3[0].displayName}</p>
                    <p className="text-sm font-black text-yellow-300">
                      {tab === 'wins' ? top3[0].wins : tab === 'streak' ? top3[0].highestWinStreak : top3[0].mvpCount}
                    </p>
                  </motion.div>
                )}

                {top3[2] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: '50%', opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.5 }}
                    className="flex-1 max-w-[90px] flex flex-col items-center justify-start pt-3 rounded-t-xl border border-amber-700/30"
                    style={{ background: 'rgba(180,83,9,0.08)' }}
                  >
                    <span className="text-xl">🥉</span>
                    <p className="text-[10px] font-black text-amber-500 mt-1 text-center px-1 truncate w-full">{top3[2].displayName}</p>
                    <p className="text-xs font-bold text-amber-400">
                      {tab === 'wins' ? top3[2].wins : tab === 'streak' ? top3[2].highestWinStreak : top3[2].mvpCount}
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Stacked cards list (no desktop table) */}
          <div className="glass-panel rounded-2xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {sorted.map((p, i) => {
                const winRate = p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0;
                const isTop3 = i < 3;
                return (
                  <div key={p.displayName + i} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                          style={{
                            background: isTop3 ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.06)',
                            border: isTop3 ? '1.5px solid rgba(99,102,241,0.2)' : '1.5px solid rgba(203,213,225,0.3)',
                            color: isTop3 ? 'var(--indigo)' : 'var(--text-faint)',
                          }}
                        >
                          {isTop3 ? MEDAL[i] : `#${i + 1}`}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{p.displayName}</p>
                          <p className="text-[10px] text-gray-500 font-semibold">{p.highestWinStreak > 0 ? `🔥 ${p.highestWinStreak} streak` : '—'} · {winRate}% win rate</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-neon">{tab === 'wins' ? `${p.wins} W` : tab === 'streak' ? `${p.highestWinStreak}` : `${p.mvpCount}x`}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

