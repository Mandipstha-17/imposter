import { create } from 'zustand';
import { socket } from '../socket';

export interface Player {
  playerId: string;
  guestId: string;
  name: string;
  role?: 'crewmate' | 'imposter';
  footballer?: string;
  isHost: boolean;
  isPlaying: boolean;
  hasVoted: boolean;
  votedForId: string | null;
  description?: string;
}

export interface RoomState {
  roomCode: string | null;
  status: 'lobby' | 'discussion' | 'voting' | 'tie_breaker' | 'voting_complete' | 'revealed' | 'round_summary' | null;
  players: Player[];
  hostId: string | null;
  revealImposter: boolean;
  votingStartedAt?: string;
  tiedPlayerIds: string[];
  totalRounds?: number;
  currentRound?: number;
  votingDuration?: number;
  descriptions?: { playerId: string; name: string; text: string }[];

  // Crewmates' shared real word; imposter hides it during the game
  realWord?: string;

  // Per-round discussion entries (used by the grouped multi-round summary)
  roundDescriptions?: {
    roundNumber: number;
    entries: { playerId: string; name: string; text: string }[];
  }[];
}


interface StoreState {
  guestId: string;
  playerId: string | null;
  playerName: string | null;
  room: RoomState | null;
  setPlayerInfo: (id: string, name: string) => void;
  setRoom: (room: RoomState) => void;
  reset: () => void;
}

const getOrGenerateGuestId = () => {
  let guestId = localStorage.getItem('guestId');
  if (!guestId) {
    guestId = 'guest_' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
    localStorage.setItem('guestId', guestId);
  }
  return guestId;
};

export const useRoomStore = create<StoreState>((set) => ({
  guestId: getOrGenerateGuestId(),
  playerId: sessionStorage.getItem('playerId') || null,
  playerName: localStorage.getItem('playerName') || null,
  room: null,
  setPlayerInfo: (id, name) => {
    sessionStorage.setItem('playerId', id);
    localStorage.setItem('playerName', name);
    set({ playerId: id, playerName: name });
  },
  setRoom: (room) => {
    if (room?.roomCode) sessionStorage.setItem('roomCode', room.roomCode);
    set({ room });
  },
  reset: () => {
    sessionStorage.removeItem('roomCode');
    sessionStorage.removeItem('playerId');
    socket.disconnect();
    set({ room: null });
  }
}));
