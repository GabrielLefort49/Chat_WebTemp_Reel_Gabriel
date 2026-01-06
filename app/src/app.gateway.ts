import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  UserProfile,
} from './socket.types';

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

  private userProfiles = new Map<string, UserProfile>();
  private userTokens = new Map<string, { email: string; role: string }>();
  private chats = new Map<string, UserProfile[]>([
    ['lobby', ['admin', 'user']],
    ['support', ['admin']],
  ]);

  constructor(private authService: AuthService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth.token;
    if (token) {
      try {
        const decoded = this.authService.verifyToken(token);
        this.userTokens.set(client.id, decoded);
        client.emit('authSuccess', { role: decoded.role, email: decoded.email });
      } catch (error) {
        client.emit('authError', { message: 'Token invalide' });
        client.disconnect();
      }
    }
  }

  handleDisconnect(client: Socket) {
    this.userProfiles.delete(client.id);
    this.userTokens.delete(client.id);
  }

  @SubscribeMessage('setProfile')
  handleSetProfile(
    @MessageBody() profile: UserProfile,
    @ConnectedSocket() client: TypedSocket,
  ) {
    const userAuth = this.userTokens.get(client.id);
    if (!userAuth) {
      return { status: 'error', data: 'Non authentifié' };
    }
    if (userAuth.role !== profile) {
      return { status: 'error', data: 'Profil non autorisé' };
    }
    (client.data as any).profile = profile;
    this.userProfiles.set(client.id, profile);
    
    const availableRooms =
      Array.from(this.chats.entries())
        .filter(([, roles]) => roles.includes(profile))
        .map(([name]) => name);

    client.emit('availableRooms', availableRooms);

    return {
      status: 'ok',
      data: `Profil ${profile} défini`,
      rooms: availableRooms,
    };
  }

  @SubscribeMessage('requestRooms')
  handleRequestRooms(@ConnectedSocket() client: TypedSocket) {
    const auth = this.userTokens.get(client.id);
    if (!auth) return { status: 'error', data: 'Non authentifié' };

    if (auth.role === 'admin') {
      const list = Array.from(this.chats.entries()).map(([name, roles]) => ({ name, roles }));
      client.emit('roomsList', list);
      return { status: 'ok', rooms: list };
    }
    const list = Array.from(this.chats.entries())
      .filter(([, roles]) => roles.includes('user'))
      .map(([name]) => name);
    client.emit('roomsList', list);
    return { status: 'ok', rooms: list };
  }

  @SubscribeMessage('createChat')
  handleCreateChat(
    @MessageBody() data: { name: string; roles: UserProfile[] },
    @ConnectedSocket() client: TypedSocket,
  ) {
    const auth = this.userTokens.get(client.id);
    if (!auth || auth.role !== 'admin') return { status: 'error', data: 'Non autorisé' };

    const name = (data.name || '').trim();
    if (!name) return { status: 'error', data: 'Nom invalide' };
    if (this.chats.has(name)) return { status: 'error', data: 'Chat existe déjà' };

    const roles: UserProfile[] = (data.roles && data.roles.length ? data.roles : (['user'] as UserProfile[]));
    this.chats.set(name, roles);

    const full = Array.from(this.chats.entries()).map(([n, r]) => ({ name: n, roles: r }));
    this.server.emit('roomsUpdated', full);

    return { status: 'ok', data: 'Chat créé', chat: { name, roles } };
  }

  @SubscribeMessage('deleteChat')
  handleDeleteChat(
    @MessageBody() data: { name: string },
    @ConnectedSocket() client: TypedSocket,
  ) {
    const auth = this.userTokens.get(client.id);
    if (!auth || auth.role !== 'admin') return { status: 'error', data: 'Non autorisé' };

    const name = (data.name || '').trim();
    if (!name || name === 'lobby') return { status: 'error', data: 'Suppression interdite' };
    if (!this.chats.has(name)) return { status: 'error', data: 'Chat introuvable' };

    this.chats.delete(name);
    const full = Array.from(this.chats.entries()).map(([n, r]) => ({ name: n, roles: r }));
    this.server.emit('roomsUpdated', full);

    return { status: 'ok', data: 'Chat supprimé', name };
  }

  @SubscribeMessage('setName')
  handleSetName(
    @MessageBody() name: string,
    @ConnectedSocket() client: TypedSocket,
  ) {
    client.data.name = name;

    this.server.to('lobby').emit('systemMessage', {
      room: 'lobby',
      message: `${name} a rejoint le serveur.`,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    return { status: 'ok', data: 'pseudo enregistré' };
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: TypedSocket,
  ) {
    const { room } = data;
    void client.join(room);
    const pseudo = client.data.name ?? client.id;

    this.server.to(room).emit('systemMessage', {
      room,
      message: `L'utilisateur ${pseudo} a rejoint la room ${room}`,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    return { status: 'ok', room };
  }

  @SubscribeMessage('sendMessage')
  handleSendMessage(
    @MessageBody() data: { room: string; message: string },
    @ConnectedSocket() client: TypedSocket,
  ) {
    const { room, message } = data;

    this.server.to(room).emit('newMessage', {
      user: client.data.name,
      room,
      message,
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

    return { status: 'sent' };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { room: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { room } = data;
    void client.leave(room);

    this.server.to(room).emit('systemMessage', {
      room,
      message: `Un utilisateur a quitté la room ${room}`,
      timestamp: Date.now().toLocaleString(),
    });

    return { status: 'left', room };
  }
}
