import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES, EMBED_COLORS } from "../constants";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import { createErrorEmbed, createSuccessEmbed, createInfoEmbed } from "../lib/embed";
import { mutex } from "../lib/mutex";
import { getAllServers } from "../utils";

export const stop = {
	name: "stop",
	data: new SlashCommandBuilder()
		.setName("stop")
		.setDescription("Stops a running Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to stop")
				.setAutocomplete(true)
				.setRequired(true),
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
				all: false,
				filters: {
					label: filterLabelBuilder({ managed: true, name: serverName }),
				},
			});
			const container = containers[0];
			if (!container) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(`No server found with the name "${serverName}".`),
					],
				});
				return;
			}

			const containerInstance = docker.getContainer(container.Id);

			const isRunning = container.State === "running";
			if (!isRunning) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(`Server "${serverName}" is already stopped.`),
					],
				});
				return;
			}

			await containerInstance.stop();
			console.log(`Minecraft server "${serverName}" stopped.`);

			await interaction.editReply({ embeds: [createSuccessEmbed("Server stopped successfully.")] });
		} catch (error) {
			console.error("Error stopping the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while stopping the Minecraft server. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
