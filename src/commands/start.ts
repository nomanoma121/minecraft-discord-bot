import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import {
	AUTOCOMPLETE_MAX_CHOICES,
	EMBED_COLORS,
	HEALTH_STATUS,
} from "../constants";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { getAllServers, getRunningServers } from "../utils";

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
				.setRequired(true)
				.setAutocomplete(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focusedValue = interaction.options.getFocused();
		const servers = await getAllServers();
		const filtered = servers.filter((server) =>
			server.name.toLowerCase().startsWith(focusedValue.toLowerCase()),
		);
		await interaction.respond(
			filtered.slice(0, AUTOCOMPLETE_MAX_CHOICES).map((server) => ({
				name: server.name,
				value: server.name,
			})),
		);
	},

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
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true, name: serverName }),
				},
			});
			const container = containers[0];
			if (!container) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Server with name "${serverName}" does not exist.`,
						),
					],
				});
				return;
			}

			const runningServers = await getRunningServers();
			if (runningServers.length > 0) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`Another server is already running. Please stop it before starting a new one.`,
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n⌛ Starting Minecraft Server...`,
			);

			const containerInstance = docker.getContainer(container.Id);
			await containerInstance.start();

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Start container\n⌛ Waiting for Minecraft server to be ready...`,
			);

			const startTime = Date.now();
			let isHealthy = false;

			while (Date.now() - startTime < HEALTH_TIMEOUT) {
				await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL));

				const info = await containerInstance.inspect();
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
							`Server "${serverName}" failed to start. Please try again later.`,
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Start server\n✅ Minecraft server ready\n\n`,
			);

			const server = parseLabels(container.Labels);

			const embed = new EmbedBuilder()
				.setTitle(`Minecraft Server "${serverName}" Started`)
				.setColor(EMBED_COLORS.SUCCESS)
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
