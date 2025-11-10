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

export const AUTOCOMPLETE_MAX_CHOICES = 25;

export const COMMAND_TIMEOUT_MS = 6 * 60 * 1000;

export const SERVER_DEFAULT_ICON_URL =
	"https://minecraft.wiki/images/Grass_Block_JE7_BE6.png";

export const BACKUPS_DIR_PATH = "/app/data/backups";

export const ICONS_DIR_PATH = "/app/data/icons";

export const MINECRAFT_SERVER_IMAGE = "itzg/minecraft-server";
