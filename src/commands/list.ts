import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { EMBED_COLORS } from "../constants";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { getRunningServers, formatUptime } from "../utils";

export const list = {
	name: "list",
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("Lists all Minecraft servers"),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		try {
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true }),
				},
			});
			const servers = containers.map((c) => parseLabels(c.Labels));
			const runningServers = await getRunningServers();

			const embed = new EmbedBuilder()
				.setTitle("All Servers")
				.setColor(EMBED_COLORS.SUCCESS);

			let description = "";

			for (const server of servers) {
				let status = "";
				const isRunning = runningServers.some((s) => s.id === server.id);
				status = isRunning ? "Running" : "Stopped";
				const container = docker.getContainer(server.id);
				const containerInfo = await container.inspect();
				status += isRunning
					? `${containerInfo.State.StartedAt}`
					: `${containerInfo.State.FinishedAt}`;
				description += `- **${server.name}** (owner: <@${server.ownerId}>) - ${formatUptime(status)}\n`;
			}

			if (servers.length === 0) {
				description =
					"No servers found. Use `/create` to create your first server!";
			}

			embed.setDescription(description);

			await interaction.editReply({ embeds: [embed] });
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
