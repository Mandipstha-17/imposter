import { PlayerStats } from '../models/PlayerStats';
import { IRoom } from '../models/Room';

export async function processMatchResults(room: IRoom, votedOutPlayerId: string | null) {
  const imposter = room.players.find(p => p.role === 'imposter');
  if (!imposter) return;

  const crewmatesWon = votedOutPlayerId === imposter.playerId;
  const playingPlayers = room.players.filter(p => p.isPlaying);
  
  for (const player of playingPlayers) {
    let stats = await PlayerStats.findOne({ guestId: player.guestId });
    if (!stats) {
      stats = new PlayerStats({ guestId: player.guestId, displayName: player.name });
    } else {
      stats.displayName = player.name; // Keep name fresh
    }

    stats.gamesPlayed += 1;
    stats.totalVotesReceived += room.players.filter(p => p.votedForId === player.playerId).length;

    const isImposter = player.role === 'imposter';
    let won = false;

    if (isImposter) {
      won = !crewmatesWon;
      if (won) stats.imposterWins += 1;
    } else {
      won = crewmatesWon;
      if (won) stats.crewmateWins += 1;
      if (player.votedForId === imposter.playerId) {
        stats.successfulImposterGuesses += 1;
      }
    }

    if (won) {
      stats.wins += 1;
      stats.currentWinStreak += 1;
      if (stats.currentWinStreak > stats.highestWinStreak) {
        stats.highestWinStreak = stats.currentWinStreak;
      }
      
      // MVP logic
      if (isImposter) stats.mvpCount += 1;
      else if (player.votedForId === imposter.playerId) stats.mvpCount += 1; 

    } else {
      stats.losses += 1;
      stats.currentWinStreak = 0;
    }

    await stats.save();
  }
}
