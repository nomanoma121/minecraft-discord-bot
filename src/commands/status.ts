import {
	AttachmentBuilder,
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import type Dockerode from "dockerode";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import { docker } from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createServerInfoEmbed,
} from "../lib/embed";
import {
	formatUptime,
	getAllServers,
	getIconImage,
	getServerByName,
} from "../utils";

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
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		try {
			const server = await getServerByName(serverName);
			if (!server) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(`No server found with the name **${serverName}**.`),
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
							`Server **${serverName}** not found. The server may be deleted.`,
						),
					],
				});
				console.error("Error inspecting container:", error);
				return;
			}
			const isRunning = containerInfo.State.Running;
			const uptime = isRunning
				? `for ${formatUptime(containerInfo.State.StartedAt)}`
				: formatUptime(containerInfo.State.FinishedAt);
			const status = `${isRunning ? "Running" : "Stopped"} ${uptime}`;

			const serverIconBuffer = await getIconImage(server.id);
			let serverIconAttachment: AttachmentBuilder | undefined;
			if (serverIconBuffer) {
				serverIconAttachment = new AttachmentBuilder(serverIconBuffer, {
					name: `${server.id}.png`,
				});
			}

			await interaction.editReply({
				embeds: [
					createServerInfoEmbed(server, {
						status,
						attachment: serverIconAttachment,
					}),
				],
				files: serverIconAttachment ? [serverIconAttachment] : [],
			});
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
