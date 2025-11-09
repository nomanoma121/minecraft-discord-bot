export const DIFFICULTY = {
	PEACEFUL: "peaceful",
	EASY: "easy",
	NORMAL: "normal",
	HARD: "hard",
} as const;

export const GAMEMODE = {
	SURVIVAL: "survival",
	CREATIVE: "creative",
	ADVENTURE: "adventure",
	SPECTATOR: "spectator",
} as const;

// Currently, only Paper is supported
export const SERVER_TYPE = {
	PAPER: "PAPER",
} as const;

export const HEALTH_STATUS = {
	HEALTHY: "healthy",
	UNHEALTHY: "unhealthy",
} as const;

export const EMBED_COLORS = {
	SUCCESS: 0x00ff00,
	ERROR: 0xff0000,
	INFO: 0x0099ff,
} as const;

export const DEFAULT_MAX_PLAYERS = 20;

// Discord API limits
export const AUTOCOMPLETE_MAX_CHOICES = 25;
