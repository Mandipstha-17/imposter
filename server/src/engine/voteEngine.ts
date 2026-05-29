import { IRoom } from '../models/Room';

export function tallyVotes(room: IRoom) {
  const playingPlayers = room.players.filter(p => p.isPlaying);
  const voteCounts: Record<string, number> = {};

  playingPlayers.forEach(p => {
    if (p.votedForId) {
      voteCounts[p.votedForId] = (voteCounts[p.votedForId] || 0) + 1;
    }
  });

  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  if (maxVotes === 0) return { tie: false, targetId: null };

  const mostVotedIds = Object.keys(voteCounts).filter(id => voteCounts[id] === maxVotes);
  
  if (mostVotedIds.length > 1) {
    return { tie: true, tiedPlayerIds: mostVotedIds };
  }

  return { tie: false, targetId: mostVotedIds[0] };
}
