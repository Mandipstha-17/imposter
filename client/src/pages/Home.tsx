import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';
import { useRoomStore } from '../store/useRoomStore';
import toast from 'react-hot-toast';

export default function Home() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [loading, setLoading] = useState(false);
  const { setPlayerInfo, playerId } = useRoomStore();

  const go = (fn: () => void) => {
    if (!name.trim()) return toast.error('Enter your nickname');
    if (tab === 'join' && !roomCode.trim()) return toast.error('Enter a room code');
    setLoading(true);
    fn();
  };

  const handleCreate = () =>
    go(() => {
      const id = playerId || Math.random().toString(36).substring(7);
      setPlayerInfo(id, name.trim());
      socket.connect();
      socket.emit('createRoom', { name: name.trim(), playerId: id, guestId: useRoomStore.getState().guestId }, (res: any) => {
        setLoading(false);
        if (!res?.success) toast.error(res?.message || 'Failed');
      });
    });

  const handleJoin = () =>
    go(() => {
      const id = Math.random().toString(36).substring(7);
      setPlayerInfo(id, name.trim());
      socket.connect();
      socket.emit(
        'joinRoom',
        { roomCode: roomCode.trim().toUpperCase(), name: name.trim(), playerId: id, guestId: useRoomStore.getState().guestId },
        (res: any) => {
          setLoading(false);
          if (!res?.success) toast.error(res?.message || 'Room not found');
        }
      );
    });

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    tab === 'create' ? handleCreate() : handleJoin();
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col gap-7 pt-4 pb-12">
      {/* Hero */}
      <div className="text-center space-y-2">
        <motion.div
          className="text-7xl leading-none select-none"
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
          style={{ filter: 'drop-shadow(0 6px 18px rgba(99,102,241,0.3))' }}
        >
          ⚽
        </motion.div>
        <div>
          <h1 className="font-display text-5xl" style={{ color: 'var(--indigo)', letterSpacing: '0.14em' }}>
            FOOTBALL
          </h1>
          <h2 className="font-display text-3xl" style={{ color: 'var(--text-muted)', letterSpacing: '0.22em' }}>
            IMPOSTER
          </h2>
        </div>
      </div>

      {/* Glass card */}
      <div className="card-elevated overflow-hidden">
        {/* Tabs */}
        <div className="grid grid-cols-2" style={{ borderBottom: '1px solid rgba(203,213,225,0.6)' }}>
          {(['create', 'join'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative py-4 text-sm font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer"
              style={{ color: tab === t ? 'var(--indigo)' : 'var(--text-faint)', background: 'none', border: 'none' }}
            >
              {t === 'create' ? '＋ Create' : '→ Join'}
              {tab === t && (
                <motion.div layoutId="tab-bar" className="absolute bottom-0 left-6 right-6 h-0.5 rounded-full" style={{ background: 'var(--indigo)' }} />
              )}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {/* Nickname */}
          <div className="space-y-1.5">
            <label className="section-label">Nickname</label>
            <div className="relative">
              <input
                className="input-light pl-10"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKey}
                maxLength={20}
                autoComplete="nickname"
                inputMode="text"
              />
            </div>
          </div>

          {/* Room code */}
          <AnimatePresence>
            {tab === 'join' && (
              <motion.div
                key="code-field"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-1.5"
              >
                <label className="section-label">Room Code</label>
                <input
                  className="input-light text-center font-black text-xl"
                  style={{ letterSpacing: '0.35em' }}
                  type="text"
                  placeholder="A B C 1 2 3"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKey}
                  maxLength={6}
                  autoComplete="off"
                  inputMode="text"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={tab === 'create' ? handleCreate : handleJoin}
            disabled={loading}
            className="w-full h-12 text-sm uppercase tracking-widest disabled:opacity-50"
            style={
              tab === 'create'
                ? { background: 'var(--indigo)', color: '#fff', fontWeight: 800, borderRadius: '14px', border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(99,102,241,0.38)', transition: 'all 0.2s' }
                : { background: 'rgba(255,255,255,0.8)', color: 'var(--text-base)', fontWeight: 700, borderRadius: '14px', border: '1.5px solid rgba(203,213,225,0.9)', cursor: 'pointer', transition: 'all 0.2s' }
            }
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : tab === 'create' ? (
              ' Create Room'
            ) : (
              '🔗 Join Room'
            )}
          </motion.button>
        </div>
      </div>

    </div>
  );
}

