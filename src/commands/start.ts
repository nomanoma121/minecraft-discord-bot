import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES, HEALTH_STATUS } from "../constants";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createServerInfoEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
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
		await interaction.deferReply();

		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.reply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const release = await mutex.acquire();

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
						createInfoEmbed(`Server with name "${serverName}" does not exist.`),
					],
				});
				return;
			}

			const runningServers = await getRunningServers();
			if (runningServers.length > 0) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Another server is already running. Please stop it before starting a new one.`,
						),
					],
				});
				return;
			}

			const containerInstance = docker.getContainer(container.Id);
			await containerInstance.start();

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

			const server = parseLabels(container.Labels);

			await interaction.editReply({ embeds: [createServerInfoEmbed(server)] });
		} catch (error) {
			console.error("Error starting the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while starting the Minecraft server. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
