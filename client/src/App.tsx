import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from './socket';
import { useRoomStore } from './store/useRoomStore';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import Reveal from './pages/Reveal';
import Leaderboard from './pages/Leaderboard';

function SocketHandler() {
  const navigate = useNavigate();
  const setRoom = useRoomStore((s) => s.setRoom);

  useEffect(() => {
    socket.on('roomUpdated', (d) => {
      setRoom(d);
      if (d.status === 'lobby') navigate('/lobby');
      else if (['discussion','voting','tie_breaker','voting_complete','round_summary'].includes(d.status)) navigate('/game');
      else if (d.status === 'revealed') {
        if (!['/lobby', '/leaderboard'].includes(window.location.pathname)) {
          navigate('/reveal');
        }
      }
    });

    const rc = sessionStorage.getItem('roomCode');
    const pid = sessionStorage.getItem('playerId');
    const gid = localStorage.getItem('guestId');
    if (rc && pid && gid && !useRoomStore.getState().room) {
      if (!socket.connected) socket.connect();
      socket.emit('reconnectRoom', { roomCode: rc, playerId: pid, guestId: gid }, (res: any) => {
        if (!res.success) { sessionStorage.removeItem('roomCode'); navigate('/'); }
      });
    }

    return () => { socket.off('roomUpdated'); };
  }, [navigate, setRoom]);

  return null;
}

function Nav() {
  const { room, playerId, reset } = useRoomStore();
  const navigate = useNavigate();
  const loc = useLocation();

  const handleLeave = () => {
    if (room && playerId) {
      socket.emit('leaveRoom', { roomCode: room.roomCode, playerId }, () => { reset(); navigate('/'); });
    } else { reset(); navigate('/'); }
  };

  return (
    <nav className="nav-glass fixed top-0 left-0 right-0 z-50 h-16">
      <div className="h-full max-w-md md:max-w-2xl mx-auto px-4 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 select-none no-underline">
          <span className="text-xl">⚽</span>
          <span className="font-display text-xl" style={{ color: 'var(--indigo)', letterSpacing: '0.12em' }}>
            Football Imposter
          </span>
        </a>
        <div className="flex items-center gap-2">
          <a href="/leaderboard"
            className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all no-underline ${
              loc.pathname === '/leaderboard'
                ? 'badge-indigo'
                : 'text-muted hover:text-base'
            }`}
            style={{ color: loc.pathname === '/leaderboard' ? 'var(--indigo)' : 'var(--text-muted)' }}
          >
            🏆 <span className="hidden sm:inline">Leaderboard</span>
          </a>
          {room && (
            <button onClick={handleLeave}
              className="badge badge-red text-xs font-bold px-3 py-1.5 rounded-xl transition-all active:scale-95 cursor-pointer"
            >
              ✕ Leave
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  const loc = useLocation();
  return (
    <>
      <SocketHandler />
      <Nav />
      <div className="page-root w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={loc.pathname} className="w-full flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            <Routes location={loc}>
              <Route path="/" element={<Home />} />
              <Route path="/lobby" element={<Lobby />} />
              <Route path="/game" element={<Game />} />
              <Route path="/reveal" element={<Reveal />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>
      <Toaster position="top-center" toastOptions={{
        duration: 2800,
        style: {
          background: '#fff',
          color: '#1e293b',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: '14px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 8px 24px rgba(99,102,241,0.15)',
        }
      }} />
    </>
  );
}

export default function Root() {
  return <Router><App /></Router>;
}
