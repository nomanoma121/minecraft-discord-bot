import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import type Dockerode from "dockerode";
import { AUTOCOMPLETE_MAX_CHOICES, EMBED_COLORS } from "../constants";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

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
		const servers = await q.getAllServers();
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
							`Server "${serverName}" not found. The server may have been deleted.`,
						),
					],
				});
				console.error("Error inspecting container:", error);
				return;
			}

			const isRunning = containerInfo.State.Running;
			if (!isRunning) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(`Server "${serverName}" is already stopped.`),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n⌛ Stopping Minecraft Server...`,
			);

			await container.stop();
			console.log(`Minecraft server "${serverName}" stopped.`);

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Stop Minecraft Server\n\n`,
			);

			const embed = new EmbedBuilder()
				.setTitle(`Minecraft Server "${serverName}" Stopped`)
				.setColor(EMBED_COLORS.SUCCESS)
				.setDescription(
					`The Minecraft server "${serverName}" has been stopped successfully.`,
				)
				.addFields(
					{ name: "Server Name", value: server.name, inline: true },
					{ name: "Version", value: server.version, inline: true },
					{ name: "Owner", value: `<@${server.ownerId}>`, inline: true },
				)
				.setFooter({ text: "Use /start to start your server again." });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error stopping the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while stopping the Minecraft server. Please try again later.",
					),
				],
			});
		}
	},
};
