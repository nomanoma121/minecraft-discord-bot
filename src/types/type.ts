import { DIFFICULTY, GAMEMODE, SERVER_TYPE } from '../constants';

export type Difficulty = typeof DIFFICULTY[keyof typeof DIFFICULTY];
export type Gamemode = typeof GAMEMODE[keyof typeof GAMEMODE];
export type ServerType = typeof SERVER_TYPE[keyof typeof SERVER_TYPE];

export type ServerConfig = {
  name: string;
  version: string;
  maxPlayers: number;
  difficulty: Difficulty;
  type: ServerType;
  gamemode: Gamemode;
  description: string;
}

export type Server = {
  id: number;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
} & ServerConfig;
