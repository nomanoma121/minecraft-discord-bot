import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import type Dockerode from "dockerode";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { getAllServers, getServerByName } from "../utils";
import { createServerInfoEmbed } from "../lib/embed";

export const status = {
	name: "status",
	data: new SlashCommandBuilder()
		.setName("status")
		.setDescription("Shows the status of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to check")
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
				embeds: [createErrorEmbed("Server name is required.")],
			});
			return;
		}

		await interaction.reply(`⌛ Fetching status for server "${serverName}"...`);

		try {
			const server = await getServerByName(serverName);
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
				console.error("Error inspecting container:", error);
				return;
			}
			const isRunning = containerInfo.State.Running;
			const statusText = isRunning ? "Running" : "Stopped";

			await interaction.editReply({ embeds: [createServerInfoEmbed(server, statusText)] });
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
