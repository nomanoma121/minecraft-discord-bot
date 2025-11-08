import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { getRunningServers } from "../utils";
import { Config } from "../config";

export const list = {
	name: "list",
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("Lists all Minecraft servers"),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("⌛ Fetching server list...");

		try {
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true }),
				},
			});
			const servers = containers.map((c) => parseLabels(c.Labels));
			const runningServers = await getRunningServers();

			let message = `**Minecraft Servers (${servers.length}/${Config.maxServerCount}):**\n\n`;

			for (const server of servers) {
				const isRunning = runningServers.some((s) => s.id === server.id);
				const statusText = isRunning ? "Running" : "Stopped";

				message += `- **${server.name}** - ${statusText}\n`;
				message += `   Version: ${server.version} | Gamemode: ${server.gamemode} | Difficulty: ${server.difficulty}\n`;
				if (server.description) {
					message += `   Description: ${server.description}\n`;
				}
				message += `   Owner: <@${server.ownerId}>\n\n`;
			}

			await interaction.editReply(message);
		} catch (error) {
			console.error("Error listing servers:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"Failed to fetch server list. Please try again later.",
					),
				],
			});
		}
	},
};
