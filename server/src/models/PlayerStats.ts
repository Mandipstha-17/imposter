import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerStats extends Document {
  guestId: string;
  displayName: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  currentWinStreak: number;
  highestWinStreak: number;
  imposterWins: number;
  crewmateWins: number;
  mvpCount: number;
  totalVotesReceived: number;
  successfulImposterGuesses: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerStatsSchema: Schema = new Schema({
  guestId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  gamesPlayed: { type: Number, default: 0 },
  currentWinStreak: { type: Number, default: 0 },
  highestWinStreak: { type: Number, default: 0 },
  imposterWins: { type: Number, default: 0 },
  crewmateWins: { type: Number, default: 0 },
  mvpCount: { type: Number, default: 0 },
  totalVotesReceived: { type: Number, default: 0 },
  successfulImposterGuesses: { type: Number, default: 0 },
}, { timestamps: true });

export const PlayerStats = mongoose.model<IPlayerStats>('PlayerStats', PlayerStatsSchema);
