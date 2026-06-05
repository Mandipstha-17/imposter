import { Server, Socket } from 'socket.io';
import { Room } from '../models/Room';
import { generateRoomCode } from '../utils/generateCode';
import { tallyVotes } from '../engine/voteEngine';
import { processMatchResults } from '../engine/statsEngine';
import fs from 'fs';
import path from 'path';

const footballersPath = path.join(__dirname, '../data/footballers.json');
const footballers: string[] = JSON.parse(fs.readFileSync(footballersPath, 'utf8'));

function broadcastRoomUpdate(io: Server, room: any) {
  room.players.forEach((p: any) => {
    io.to(p.socketId).emit('roomUpdated', sanitizeRoom(room, p.playerId));
  });
}

function sanitizeRoom(room: any, targetPlayerId: string) {
  const roomObj = room.toObject ? room.toObject() : { ...room };

  const targetPlayer = roomObj.players?.find((p: any) => p.playerId === targetPlayerId);
  if (targetPlayer && !targetPlayer.isPlaying) {
    // Spectators see everything
    return roomObj;
  }

  // During active game phases, hide each player's role/footballer from others
  // BUT keep descriptions visible to everyone during discussion
  if (['voting', 'tie_breaker', 'voting_complete'].includes(roomObj.status)) {
    roomObj.players = roomObj.players.map((p: any) => {
      if (p.playerId !== targetPlayerId) {
        return { ...p, role: undefined, footballer: undefined, votedForId: undefined };
      }
      return p;
    });
  }

  if (roomObj.status === 'discussion') {
    // During discussion: hide role/footballer from others, BUT show description to everyone
    roomObj.players = roomObj.players.map((p: any) => {
      if (p.playerId !== targetPlayerId) {
        return { ...p, role: undefined, footballer: undefined, votedForId: undefined };
        // description is kept visible for all
      }
      return p;
    });
  }

  return roomObj;
}

function assignRoles(room: any) {
  const playingPlayers = room.players.filter((p: any) => p.isPlaying);
  if (playingPlayers.length === 0) return;

  const imposterIndex = Math.floor(Math.random() * playingPlayers.length);
  const shuffled = [...footballers].sort(() => 0.5 - Math.random());
  const crewmateFootballer = shuffled[0];

  room.players.forEach((p: any) => {
    p.votedForId = null;
    p.hasVoted = false;
    p.description = '';

    if (!p.isPlaying) {
      p.role = 'crewmate';
      p.footballer = '';
      return;
    }

    const playingIndex = playingPlayers.findIndex((pp: any) => pp.playerId === p.playerId);
    if (playingIndex === imposterIndex) {
      p.role = 'imposter';
      p.footballer = ''; // Imposter gets NO word — only knows they are imposter
    } else {
      p.role = 'crewmate';
      p.footballer = crewmateFootballer;
    }
  });

  // Set turn order randomly
  const playerIds = playingPlayers.map((p: any) => p.playerId);
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }
  room.turnOrder = playerIds;
  room.currentTurnIndex = 0;
}

function nextRoundRoles(room: any) {
  room.players.forEach((p: any) => {
    p.votedForId = null;
    p.hasVoted = false;
    p.description = '';
  });
  // Reset turn to first player in the same turn order
  room.currentTurnIndex = 0;
}

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // CREATE ROOM
    socket.on('createRoom', async ({ name, playerId, guestId }, callback) => {
      try {
        if (!guestId) return typeof callback === 'function' && callback({ success: false, message: 'Missing guestId' });
        const roomCode = generateRoomCode();
        const room = new Room({
          roomCode,
          hostId: playerId,
          status: 'lobby',
          totalRounds: 3,
          currentRound: 1,
          votingDuration: 120,
          descriptions: [],
          players: [{
            playerId, guestId, socketId: socket.id,
            name, isHost: true, role: 'crewmate',
            footballer: '', isPlaying: true,
            votedForId: null, hasVoted: false, description: ''
          }]
        });
        await room.save();
        socket.join(roomCode);
        if (typeof callback === 'function') callback({ success: true, roomCode });
        io.to(roomCode).emit('roomUpdated', sanitizeRoom(room, playerId));
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, message: 'Failed to create room' });
      }
    });

    // JOIN ROOM
    socket.on('joinRoom', async ({ roomCode, name, playerId, guestId }, callback) => {
      try {
        if (!guestId) return typeof callback === 'function' && callback({ success: false, message: 'Missing guestId' });
        const room = await Room.findOne({ roomCode: roomCode.toUpperCase() });
        if (!room) return typeof callback === 'function' && callback({ success: false, message: 'Room not found' });

        const existingPlayer = room.players.find(p => p.playerId === playerId);
        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          existingPlayer.name = name;
          existingPlayer.guestId = guestId;
        } else {
          if (room.status !== 'lobby') {
            return typeof callback === 'function' && callback({ success: false, message: 'Game already in progress' });
          }
          room.players.push({
            playerId, guestId, socketId: socket.id,
            name, isHost: false, role: 'crewmate',
            footballer: '', isPlaying: true,
            votedForId: null, hasVoted: false,
            description: '', joinedAt: new Date()
          } as any);
        }

        await room.save();
        socket.join(room.roomCode);
        if (typeof callback === 'function') callback({ success: true, roomCode: room.roomCode });
        broadcastRoomUpdate(io, room);
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, message: 'Failed to join room' });
      }
    });

    // LEAVE ROOM
    socket.on('leaveRoom', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return typeof callback === 'function' && callback({ success: false });

        room.players = room.players.filter(p => p.playerId !== playerId) as any;

        if (room.players.length === 0) {
          await Room.deleteOne({ roomCode });
        } else {
          if (room.hostId === playerId) {
            room.hostId = room.players[0].playerId;
            room.players[0].isHost = true;
          }
          room.tiedPlayerIds = room.tiedPlayerIds.filter(id => id !== playerId);
          await room.save();
          broadcastRoomUpdate(io, room);
        }

        socket.leave(roomCode);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // RECONNECT ROOM
    socket.on('reconnectRoom', async ({ roomCode, playerId, guestId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return typeof callback === 'function' && callback({ success: false, message: 'Room not found' });

        const existingPlayer = room.players.find(p => p.playerId === playerId);
        if (existingPlayer) {
          existingPlayer.socketId = socket.id;
          socket.join(roomCode);
          await room.save();
          if (typeof callback === 'function') callback({ success: true, roomCode });
          broadcastRoomUpdate(io, room);
        } else {
          if (typeof callback === 'function') callback({ success: false, message: 'Player not in room' });
        }
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // TOGGLE HOST MODE
    socket.on('toggle_host_mode', async ({ roomCode, playerId, isPlaying }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room) return typeof callback === 'function' && callback({ success: false });
        if (room.hostId !== playerId || room.status !== 'lobby') return typeof callback === 'function' && callback({ success: false });

        const host = room.players.find(p => p.playerId === playerId);
        if (host) {
          host.isPlaying = isPlaying;
          await room.save();
          broadcastRoomUpdate(io, room);
        }
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // SET ROUNDS (host configures before starting)
    socket.on('set_rounds', async ({ roomCode, playerId, totalRounds }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId || room.status !== 'lobby') {
          return typeof callback === 'function' && callback({ success: false });
        }
        const rounds = Math.max(1, Math.min(10, parseInt(totalRounds) || 3));
        room.totalRounds = rounds;
        await room.save();
        broadcastRoomUpdate(io, room);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // START GAME
    socket.on('startGame', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) return typeof callback === 'function' && callback({ success: false });

        const playingPlayers = room.players.filter(p => p.isPlaying);
        if (playingPlayers.length < 1) return typeof callback === 'function' && callback({ success: false, message: 'Need at least 1 active player' });

        room.currentRound = 1;
        room.descriptions = [];
        room.roundDescriptions = [];
        assignRoles(room);

        room.status = 'discussion';
        room.revealImposter = false;
        room.tiedPlayerIds = [];
        await room.save();

        broadcastRoomUpdate(io, room);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // SUBMIT DESCRIPTION — turn-by-turn, clues shown live
    socket.on('submit_description', async ({ roomCode, playerId, text }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.status !== 'discussion') {
          return typeof callback === 'function' && callback({ success: false, message: 'Not in discussion phase' });
        }
        const player = room.players.find(p => p.playerId === playerId);
        if (!player || !player.isPlaying) {
          return typeof callback === 'function' && callback({ success: false, message: 'Player not found' });
        }

        // Enforce turn order: only the active player may submit
        const turnOrder: string[] = room.turnOrder ?? [];
        const currentTurnPlayerId = turnOrder[room.currentTurnIndex ?? 0];
        if (currentTurnPlayerId && currentTurnPlayerId !== playerId) {
          return typeof callback === 'function' && callback({ success: false, message: 'Not your turn' });
        }

        player.description = String(text || '').substring(0, 200);

        // Advance to next turn
        room.currentTurnIndex = (room.currentTurnIndex ?? 0) + 1;

        await room.save();

        // Broadcast live update so everyone sees the new clue immediately
        broadcastRoomUpdate(io, room);

        // Check if all playing players have taken their turn this round
        const playingPlayers = room.players.filter(p => p.isPlaying);
        const allSubmitted = room.currentTurnIndex >= turnOrder.length;

        if (allSubmitted) {
          // Save descriptions for this round
          const roundEntries = playingPlayers.map(p => ({
            playerId: p.playerId,
            name: p.name,
            text: p.description
          }));

          const existingRound = room.roundDescriptions.find(r => r.roundNumber === room.currentRound);
          if (!existingRound) {
            room.roundDescriptions.push({
              roundNumber: room.currentRound,
              entries: roundEntries
            } as any);
          }

          if (room.currentRound < room.totalRounds) {
            // Auto-advance to next round after a short pause
            room.descriptions = roundEntries as any;
            await room.save();
            broadcastRoomUpdate(io, room);

            setTimeout(async () => {
              try {
                const refreshedRoom = await Room.findOne({ roomCode });
                if (!refreshedRoom || refreshedRoom.status !== 'discussion') return;

                refreshedRoom.currentRound += 1;
                nextRoundRoles(refreshedRoom);
                await refreshedRoom.save();
                broadcastRoomUpdate(io, refreshedRoom);
              } catch (e) {
                console.error(e);
              }
            }, 2000);
          } else {
            // All rounds done — save and let host start voting
            room.descriptions = roundEntries as any;
            await room.save();
            broadcastRoomUpdate(io, room);
          }
        }

        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });


    // START VOTING
    socket.on('start_voting', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId || room.status !== 'discussion') {
          return typeof callback === 'function' && callback({ success: false });
        }

        // Save final round descriptions if not already saved
        const playingPlayers = room.players.filter(p => p.isPlaying);
        const roundEntries = playingPlayers.map(p => ({
          playerId: p.playerId,
          name: p.name,
          text: p.description || ''
        }));

        const existingRound = room.roundDescriptions.find(r => r.roundNumber === room.currentRound);
        if (!existingRound) {
          room.roundDescriptions.push({
            roundNumber: room.currentRound,
            entries: roundEntries
          } as any);
        }

        room.descriptions = roundEntries as any;

        room.status = 'voting';
        room.votingStartedAt = new Date();
        await room.save();

        broadcastRoomUpdate(io, room);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    // CAST VOTE
    socket.on('cast_vote', async ({ roomCode, playerId, targetId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || !['voting', 'tie_breaker'].includes(room.status)) {
          return typeof callback === 'function' && callback({ success: false, message: 'Not in voting phase' });
        }

        const voter = room.players.find(p => p.playerId === playerId);
        const target = room.players.find(p => p.playerId === targetId);

        if (!voter || !voter.isPlaying) return typeof callback === 'function' && callback({ success: false, message: 'Spectators cannot vote' });
        if (voter.hasVoted) return typeof callback === 'function' && callback({ success: false, message: 'Already voted' });
        if (!target || !target.isPlaying) return typeof callback === 'function' && callback({ success: false, message: 'Invalid target' });
        if (playerId === targetId) return typeof callback === 'function' && callback({ success: false, message: 'Cannot vote for yourself' });

        if (room.status === 'tie_breaker' && !room.tiedPlayerIds.includes(targetId)) {
          return typeof callback === 'function' && callback({ success: false, message: 'Must vote for tied players only' });
        }

        voter.votedForId = targetId;
        voter.hasVoted = true;
        await room.save();

        const playingPlayers = room.players.filter(p => p.isPlaying);
        const allVoted = playingPlayers.every(p => p.hasVoted);

        if (allVoted) {
          const result = tallyVotes(room);
          if (result.tie && result.tiedPlayerIds) {
            room.status = 'tie_breaker';
            room.tiedPlayerIds = result.tiedPlayerIds;
            room.players.forEach(p => { p.hasVoted = false; p.votedForId = null; });
            io.to(room.roomCode).emit('tie_breaker_started');
          } else {
            room.status = 'voting_complete';
            io.to(room.roomCode).emit('voting_completed');
          }
          await room.save();
        }

        broadcastRoomUpdate(io, room);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, message: 'Failed to cast vote' });
      }
    });

    // REVEAL IMPOSTER
    socket.on('revealImposter', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId || room.status !== 'voting_complete') {
          return typeof callback === 'function' && callback({ success: false, message: 'Not host or not ready' });
        }

        const result = tallyVotes(room);
        await processMatchResults(room, result.tie ? null : (result.targetId ?? null));

        room.status = 'revealed';
        room.revealImposter = true;
        await room.save();

        broadcastRoomUpdate(io, room);
        io.to(roomCode).emit('game_revealed');
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, message: 'Failed to reveal' });
      }
    });

    // RESTART / NEXT ROUND
    socket.on('restartGame', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) return typeof callback === 'function' && callback({ success: false });

        room.status = 'lobby';
        room.revealImposter = false;
        room.votingStartedAt = undefined;
        room.tiedPlayerIds = [];
        room.currentRound = 1;
        room.descriptions = [];
        room.roundDescriptions = [];
        room.players.forEach(p => {
          p.role = 'crewmate';
          p.footballer = '';
          p.hasVoted = false;
          p.votedForId = null;
          p.description = '';
        });
        await room.save();

        broadcastRoomUpdate(io, room);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}
