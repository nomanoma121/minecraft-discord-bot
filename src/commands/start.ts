import {
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { HEALTH_STATUS } from "../constants";
import { queries as q } from "../db/queries";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

const HEALTH_INTERVAL = 5000;
const HEALTH_TIMEOUT = 300000;

export const start = {
	name: "start",
	data: new SlashCommandBuilder()
		.setName("start")
		.setDescription("Starts an existing Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to start")
				.setRequired(true),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.reply({
				embeds: [createErrorEmbed("Server name is required.")],
			});
			return;
		}

		await interaction.reply(`⌛ Checking server "${serverName}"...`);

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

			const runningContainers = await docker.listContainers({ all: false });
			if (runningContainers.length > 0) {
				const runningNames = runningContainers
					.map((c) => c.Names?.[0]?.replace(/^\//, ""))
					.join(", ");
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Cannot start server "${serverName}" because the following servers are already running: ${runningNames}. Please stop them first.`,
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n⌛ Starting Minecraft Server...`,
			);

			const container = docker.getContainer(server.id);

			try {
				await container.inspect();
			} catch (_error) {
				// TODO: Database cleanup if container is missing
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Server "${serverName}" not found. The server may have been deleted.`,
						),
					],
				});
				return;
			}

			await container.start();

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Start container\n⌛ Waiting for Minecraft server to be ready...`,
			);

			const startTime = Date.now();
			let isHealthy = false;

			while (Date.now() - startTime < HEALTH_TIMEOUT) {
				await new Promise((resolve) =>
					setTimeout(resolve, HEALTH_INTERVAL),
				);

				const info = await container.inspect();
				const healthStatus = info.State.Health?.Status;

				if (healthStatus === HEALTH_STATUS.HEALTHY) {
					isHealthy = true;
					break;
				}

				if (healthStatus === HEALTH_STATUS.UNHEALTHY) {
					break;
				}
			}

			if (!isHealthy) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Server "${serverName}" failed to start. Please check logs.`,
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Start server\n✅ Minecraft server ready\n\n`,
			);

			const embed = new EmbedBuilder()
				.setTitle(`Minecraft Server "${serverName}" Started`)
				.setColor(0x00ff00)
				.setDescription(
					`The Minecraft server "${serverName}" has been started successfully.`,
				)
				.addFields(
					{ name: "Server Name", value: server.name, inline: true },
					{ name: "Version", value: server.version, inline: true },
					{ name: "Gamemode", value: server.gamemode, inline: true },
					{ name: "Difficulty", value: server.difficulty, inline: true },
					{
						name: "Max Players",
						value: server.maxPlayers.toString(),
						inline: true,
					},
					{
						name: "Description",
						value: server.description || "N/A",
						inline: false,
					},
					{ name: "Owner", value: `<@${server.ownerId}>`, inline: true },
				)
				.setFooter({ text: "Enjoy your game!" });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error starting the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while starting the Minecraft server. Please try again later.",
					),
				],
			});
		}
	},
};
