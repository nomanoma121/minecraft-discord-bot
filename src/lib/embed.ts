import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS, SERVER_DEFAULT_ICON_URL } from "../constants";
import type { Server } from "../types/server";

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

export const createServerInfoEmbed = (server: Server, status?: string) => {
	const embed = new EmbedBuilder()
		.setTitle(server.name)
		.setColor(EMBED_COLORS.INFO)
		.setDescription(server.description)
		.setThumbnail(SERVER_DEFAULT_ICON_URL)
		.addFields(
			{ name: "Version", value: server.version },
			{ name: "Server Type", value: server.type },
			{ name: "Gamemode", value: server.gamemode },
			{ name: "Difficulty", value: server.difficulty },
			{ name: "Owner", value: `<@${server.ownerId}>` },
			{ name: "Max Player", value: server.maxPlayers }
		)

	if (status) {
		embed.setFields({ name: "Status", value: status })
	}
	
	return embed;
}
