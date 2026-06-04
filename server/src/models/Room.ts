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
  description: string;
  joinedAt: Date;
}

export interface IDescription {
  playerId: string;
  name: string;
  text: string;
}

export interface IRoundDescription {
  roundNumber: number;
  entries: IDescription[];
}

export interface IRoom extends Document {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'discussion' | 'voting' | 'tie_breaker' | 'voting_complete' | 'round_summary' | 'revealed';
  revealImposter: boolean;
  votingStartedAt?: Date;
  tiedPlayerIds: string[];
  players: IPlayer[];
  totalRounds: number;
  currentRound: number;
  votingDuration: number;
  descriptions: IDescription[];
  roundDescriptions: IRoundDescription[];
  turnOrder: string[];
  currentTurnIndex: number;
  createdAt: Date;
}

const PlayerSchema: Schema = new Schema({
  playerId:    { type: String, required: true },
  guestId:     { type: String, required: true },
  socketId:    { type: String, required: true },
  name:        { type: String, required: true },
  role:        { type: String, enum: ['crewmate', 'imposter'], default: 'crewmate' },
  footballer:  { type: String, default: '' },
  isHost:      { type: Boolean, default: false },
  isPlaying:   { type: Boolean, default: true },
  votedForId:  { type: String, default: null },
  hasVoted:    { type: Boolean, default: false },
  description: { type: String, default: '' },
  joinedAt:    { type: Date, default: Date.now }
});

const DescriptionSchema: Schema = new Schema({
  playerId: { type: String, required: true },
  name:     { type: String, required: true },
  text:     { type: String, default: '' }
});

const RoundDescriptionSchema: Schema = new Schema({
  roundNumber: { type: Number, required: true },
  entries:     [DescriptionSchema]
});

const RoomSchema: Schema = new Schema({
  roomCode:         { type: String, required: true, unique: true },
  hostId:           { type: String, required: true },
  status:           { type: String, enum: ['lobby','discussion','voting','tie_breaker','voting_complete','round_summary','revealed'], default: 'lobby' },
  revealImposter:   { type: Boolean, default: false },
  votingStartedAt:  { type: Date },
  tiedPlayerIds:    [{ type: String }],
  players:          [PlayerSchema],
  totalRounds:      { type: Number, default: 3 },
  currentRound:     { type: Number, default: 1 },
  votingDuration:   { type: Number, default: 120 },
  descriptions:     [DescriptionSchema],
  roundDescriptions:[RoundDescriptionSchema],
  turnOrder:        [{ type: String }],
  currentTurnIndex: { type: Number, default: 0 },
  createdAt:        { type: Date, default: Date.now, expires: 86400 }
});

export const Room = mongoose.model<IRoom>('Room', RoomSchema);
