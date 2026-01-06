export type UserProfile = 'admin' | 'user';

export interface ServerToClientEvents {
  newMessage: (payload: {
    user: string | undefined;
    room: string;
    message: string;
    timestamp: string;
  }) => void;
  systemMessage: (payload: {
    room: string;
    message: string;
    timestamp: string;
  }) => void;
  ack: (msg: string) => void;
  availableRooms: (rooms: string[]) => void;
  roomsList: (rooms: Array<string> | Array<{ name: string; roles: UserProfile[] }>) => void;
  roomsUpdated: (rooms: Array<{ name: string; roles: UserProfile[] }>) => void;
}

export interface ClientToServerEvents {
  message: (text: string) => void;
  setName: (name: string) => void;
  setProfile: (profile: UserProfile) => void;
  requestRooms: () => void;
  createChat: (data: { name: string; roles: UserProfile[] }) => void;
  deleteChat: (data: { name: string }) => void;
}

export interface InterServerEvents {
  message: (text: string) => void;
}

export interface SocketData {
  name?: string;
  profile?: UserProfile;
}
