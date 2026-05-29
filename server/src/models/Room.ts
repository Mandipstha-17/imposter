import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer {
  playerId: string;
  guestId: string;
  socketId: string;
  name: string;
  role: 'crewmate' | 'imposter';
  footballer: string;
  isHost: boolean;
  isPlaying: boolean;
  votedForId: string | null;
  hasVoted: boolean;
  joinedAt: Date;
}

export interface IRoom extends Document {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'discussion' | 'voting' | 'tie_breaker' | 'voting_complete' | 'revealed';
  revealImposter: boolean;
  votingStartedAt?: Date;
  tiedPlayerIds: string[];
  players: IPlayer[];
  createdAt: Date;
}

const PlayerSchema: Schema = new Schema({
  playerId: { type: String, required: true },
  guestId: { type: String, required: true },
  socketId: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['crewmate', 'imposter'], default: 'crewmate' },
  footballer: { type: String, default: '' },
  isHost: { type: Boolean, default: false },
  isPlaying: { type: Boolean, default: true },
  votedForId: { type: String, default: null },
  hasVoted: { type: Boolean, default: false },
  joinedAt: { type: Date, default: Date.now }
});

const RoomSchema: Schema = new Schema({
  roomCode: { type: String, required: true, unique: true },
  hostId: { type: String, required: true },
  status: { type: String, enum: ['lobby', 'discussion', 'voting', 'tie_breaker', 'voting_complete', 'revealed'], default: 'lobby' },
  revealImposter: { type: Boolean, default: false },
  votingStartedAt: { type: Date },
  tiedPlayerIds: [{ type: String }],
  players: [PlayerSchema],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Auto-delete after 24h
});

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
