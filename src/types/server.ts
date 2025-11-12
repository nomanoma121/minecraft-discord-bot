import type {
	DIFFICULTY,
	EMBED_COLORS,
	GAMEMODE,
	LEVEL,
	SERVER_TYPE,
} from "../constants";

export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];
export type Gamemode = (typeof GAMEMODE)[keyof typeof GAMEMODE];
export type ServerType = (typeof SERVER_TYPE)[keyof typeof SERVER_TYPE];
export type EmbedColor = (typeof EMBED_COLORS)[keyof typeof EMBED_COLORS];
export type Level = (typeof LEVEL)[keyof typeof LEVEL];

export type Server = {
	id: string;
	ownerId: string;
	name: string;
	version: string;
	iconPath?: string;
	maxPlayers: string;
	difficulty: Difficulty;
	type: ServerType;
	gamemode: Gamemode;
	description: string;
	level: Level;
	pvp: boolean;
	hardcore: boolean;
	enableWhitelist: boolean;
	createdAt: Date;
	updatedAt: Date;
};

export type Operator = {
	uuid: string;
	name: string;
	level: number;
	bypassesPlayerLimit: boolean;
};

export type Whitelist = {
	uuid: string;
	name: string;
};
