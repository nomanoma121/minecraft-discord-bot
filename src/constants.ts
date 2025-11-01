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
