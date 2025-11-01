import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import type Dockerode from "dockerode";
import { queries as q } from "../db/queries";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

export const status = {
	name: "status",
	data: new SlashCommandBuilder()
		.setName("status")
		.setDescription("Shows the status of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to check")
				.setRequired(true),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const serverName = interaction.options.getString("server-name")!;

		await interaction.reply(`⌛ Fetching status for server "${serverName}"...`);

		try {
			const server = await q.getServerByName(serverName);
			if (!server) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(`No server found with the name "${serverName}".`),
					],
				});
				return;
			}

			const container = docker.getContainer(server.id);
			let containerInfo: Dockerode.ContainerInspectInfo;

			try {
				containerInfo = await container.inspect();
			} catch (error) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Server "${serverName}" not found. The server may be deleted.`,
						),
					],
				});
				return;
			}
			const isRunning = containerInfo.State.Running;
			const statusText = isRunning ? "Running" : "Stopped";

			const embed = new EmbedBuilder()
				.setTitle(`Status of Minecraft Server: ${serverName}`)
				.setColor(isRunning ? 0x00ff00 : 0xff0000)
				.addFields(
					{ name: "Status", value: statusText, inline: true },
					{ name: "Version", value: server.version, inline: true },
					{ name: "Gamemode", value: server.gamemode, inline: true },
					{ name: "Difficulty", value: server.difficulty, inline: true },
					{ name: "Owner", value: `<@${server.ownerId}>`, inline: true },
				);

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error checking server status:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while fetching the server status. Please try again later.",
					),
				],
			});
		}
	},
};
