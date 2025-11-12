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

export const SERVER_TYPE = {
	PAPER: "PAPER",
	VANILLA: "VANILLA",
	FORGE: "FORGE",
} as const;

export const LEVEL = {
	NORMAL: "normal",
	FLAT: "flat",
	LARGE_BIOMES: "large_biomes",
	AMPLIFIED: "amplified",
	SINGLE_BIOME_SURFACE: "single_biome_surface",
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

export const OPTIONS = {
	SERVER_NAME: "server-name",
	DESCRIPTION: "description",
	MAX_PLAYERS: "max-players",
	GAMEMODE: "gamemode",
	DIFFICULTY: "difficulty",
	VERSION: "version",
	SERVER_TYPE: "server-type",
	HARDCORE: "hardcore",
	PVP: "pvp",
	WHITELIST: "whitelist",
	LEVEL: "level",
	OPS: "ops",
	ICON: "icon",
	BACKUP: "backup",
	ENABLE_WHITELIST: "enable-whitelist",
} as const;

export const DEFAULT_MAX_PLAYERS = 20;

export const AUTOCOMPLETE_MAX_CHOICES = 25;

export const COMMAND_TIMEOUT_MS = 6 * 60 * 1000;

export const SERVER_DEFAULT_ICON_URL =
	"https://minecraft.wiki/images/Grass_Block_JE7_BE6.png";

export const BACKUPS_DIR_PATH = "/app/data/backups";

export const ICONS_DIR_PATH = "/app/data/icons";

export const MINECRAFT_SERVER_IMAGE = "itzg/minecraft-server";

export const ICONS_VOLUME_NAME = "minecraft-discord-bot_icons";
