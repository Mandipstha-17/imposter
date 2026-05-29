import { io, Socket } from 'socket.io-client';
import { getServerUrl } from '../config';

export const socket: Socket = io(getServerUrl(), {
  autoConnect: false, // Connect manually when needed
  withCredentials: true
});
