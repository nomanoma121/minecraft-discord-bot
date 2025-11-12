import type { AttachmentBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS, SERVER_DEFAULT_ICON_URL } from "../constants";
import type { Server } from "../types/server";
import { formatDateForDisplay } from "../utils";

export const createErrorEmbed = (errorMessage: string) => {
	return new EmbedBuilder()
		.setTitle("Error")
		.setColor(EMBED_COLORS.ERROR)
		.setDescription(errorMessage);
};

export const createInfoEmbed = (description: string) => {
	return new EmbedBuilder()
		.setTitle("Info")
		.setColor(EMBED_COLORS.INFO)
		.setDescription(description);
};

export const createSuccessEmbed = (description: string) => {
	return new EmbedBuilder()
		.setTitle("Success")
		.setColor(EMBED_COLORS.SUCCESS)
		.setDescription(description);
};

export const createServerInfoEmbed = (
	server: Server,
	options?: { status?: string; attachment?: AttachmentBuilder },
) => {
	const embed = new EmbedBuilder()
		.setTitle(server.name)
		.setColor(EMBED_COLORS.INFO)
		.setDescription(server.description)
		.addFields(
			{ name: "Owner", value: `<@${server.ownerId}>`, inline: true },
			{ name: "Version", value: server.version, inline: true },
			{ name: "Server Type", value: server.type, inline: true },
			{ name: "Gamemode", value: server.gamemode, inline: true },
			{ name: "Difficulty", value: server.difficulty, inline: true },
			{ name: "Whitelist Enabled", value: String(server.enableWhitelist), inline: true },
			{ name: "World Level", value: server.level, inline: true },
			{ name: "PVP", value: String(server.pvp), inline: true },
			{ name: "Hardcore", value: String(server.hardcore), inline: true },
			{ name: "Max Players", value: server.maxPlayers, inline: true },
			{ name: "Created At", value: formatDateForDisplay(server.createdAt), inline: true },
		)
		.setFooter({ text: `Server ID: ${server.id}` });

	if (options?.status) {
		embed.addFields({ name: "Status", value: options.status, inline: true });
	}

	if (options?.attachment) {
		embed.setThumbnail(`attachment://${options.attachment.name}`);
	} else {
		embed.setThumbnail(SERVER_DEFAULT_ICON_URL);
	}

	return embed;
};
