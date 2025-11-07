import type {
	DIFFICULTY,
	EMBED_COLORS,
	GAMEMODE,
	SERVER_TYPE,
} from "../constants";

export type Difficulty = (typeof DIFFICULTY)[keyof typeof DIFFICULTY];
export type Gamemode = (typeof GAMEMODE)[keyof typeof GAMEMODE];
export type ServerType = (typeof SERVER_TYPE)[keyof typeof SERVER_TYPE];
export type EmbedColor = (typeof EMBED_COLORS)[keyof typeof EMBED_COLORS];

export type Server = {
	id: string;
	ownerId: string;
	name: string;
	version: string;
	maxPlayers: number;
	difficulty: Difficulty;
	type: ServerType;
	gamemode: Gamemode;
	description: string;
	createdAt: Date;
	updatedAt: Date;
}
