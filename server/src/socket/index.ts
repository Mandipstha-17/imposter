import { Server, Socket } from 'socket.io';
import { Room } from '../models/Room';
import { generateRoomCode } from '../utils/generateCode';
import { tallyVotes } from '../engine/voteEngine';
import { processMatchResults } from '../engine/statsEngine';
import fs from 'fs';
import path from 'path';

const footballersPath = path.join(__dirname, '../data/footballers.json');
const footballers: string[] = JSON.parse(fs.readFileSync(footballersPath, 'utf8'));

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
          players: [{
            playerId,
            guestId,
            socketId: socket.id,
            name,
            isHost: true,
            role: 'crewmate',
            footballer: '',
            isPlaying: true,
            votedForId: null,
            hasVoted: false
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
          existingPlayer.guestId = guestId; // ensure latest guestId
        } else {
          if (room.status !== 'lobby') {
            return typeof callback === 'function' && callback({ success: false, message: 'Game already in progress' });
          }
          room.players.push({
            playerId,
            guestId,
            socketId: socket.id,
            name,
            isHost: false,
            role: 'crewmate',
            footballer: '',
            isPlaying: true,
            votedForId: null,
            hasVoted: false,
            joinedAt: new Date()
          });
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
        if (!room) return typeof callback === 'function' && callback({ success: false, message: 'Room not found' });
        
        room.players = room.players.filter(p => p.playerId !== playerId);
        
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

    // START GAME
    socket.on('startGame', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) return typeof callback === 'function' && callback({ success: false });
        
        const playingPlayers = room.players.filter(p => p.isPlaying);
        if (playingPlayers.length < 1) return typeof callback === 'function' && callback({ success: false, message: 'Need at least 1 active player' });

        const imposterIndex = Math.floor(Math.random() * playingPlayers.length);
        const shuffled = [...footballers].sort(() => 0.5 - Math.random());
        const crewmateFootballer = shuffled[0];
        const imposterFootballer = shuffled[1];

        room.players.forEach((p) => {
          p.votedForId = null;
          p.hasVoted = false;
          if (!p.isPlaying) {
            p.role = 'crewmate'; 
            p.footballer = '';
            return;
          }
          const playingIndex = playingPlayers.findIndex(pp => pp.playerId === p.playerId);
          if (playingIndex === imposterIndex) {
            p.role = 'imposter';
            p.footballer = imposterFootballer;
          } else {
            p.role = 'crewmate';
            p.footballer = crewmateFootballer;
          }
        });

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

    // START VOTING
    socket.on('start_voting', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId || room.status !== 'discussion') return typeof callback === 'function' && callback({ success: false });

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

    // REVEAL
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

    // RESTART
    socket.on('restartGame', async ({ roomCode, playerId }, callback) => {
      try {
        const room = await Room.findOne({ roomCode });
        if (!room || room.hostId !== playerId) return typeof callback === 'function' && callback({ success: false });

        room.status = 'lobby';
        room.revealImposter = false;
        room.votingStartedAt = undefined;
        room.tiedPlayerIds = [];
        room.players.forEach(p => {
          p.role = 'crewmate';
          p.footballer = '';
          p.hasVoted = false;
          p.votedForId = null;
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

function broadcastRoomUpdate(io: Server, room: any) {
  room.players.forEach((p: any) => {
    io.to(p.socketId).emit('roomUpdated', sanitizeRoom(room, p.playerId));
  });
}

function sanitizeRoom(room: any, targetPlayerId: string) {
  const roomObj = room.toObject();
  
  if (['discussion', 'voting', 'tie_breaker', 'voting_complete'].includes(roomObj.status)) {
    roomObj.players = roomObj.players.map((p: any) => {
      if (p.playerId !== targetPlayerId) {
        return {
          ...p,
          role: undefined,
          footballer: undefined,
          votedForId: undefined 
        };
      }
      return p;
    });
  }
  
  return roomObj;
}
