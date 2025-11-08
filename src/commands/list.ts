import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

export const list = {
	name: "list",
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("Lists all Minecraft servers"),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.reply("⌛ Fetching server list...");

		try {
			const container = await docker.listContainers({
				all: false,
				filters: {
					label: filterLabelBuilder({ managed: true })
				},
			});
			const servers = container.map((c) => parseLabels(c.Labels));

			let message = `**Minecraft Servers (${servers.length}/${10}):**\n\n`;

			for (const server of servers) {
				const isRunning = container.some((c) =>
					parseLabels(c.Labels).id === server.id && c.State === "running"
				);
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
