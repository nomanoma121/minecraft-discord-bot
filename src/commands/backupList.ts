import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES, EMBED_COLORS } from "../constants";
import { getExistingBackups } from "../lib/backup";
import { createInfoEmbed } from "../lib/embed";
import { formatDateForDisplay, getAllServers, getServerByName } from "../utils";

export const backupList = {
	name: "backup-list",
	data: new SlashCommandBuilder()
		.setName("backup-list")
		.setDescription("Lists all backups for a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server to list backups for.")
				.setAutocomplete(true)
				.setRequired(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused(true);
		if (focused.name === "server-name") {
			const focusedValue = focused.value;
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
		}
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

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(`No server found with the name **${serverName}**.`),
				],
			});
			return;
		}

		const backups = await getExistingBackups(server.id);
		if (backups.length === 0) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(`No backups found for server **${serverName}**.`),
				],
			});
			return;
		}

		const backupList = backups
			.map((backup) => `- ${formatDateForDisplay(backup)}`)
			.join("\n");

		const embed = new EmbedBuilder()
			.setTitle(`Backups for server ${serverName}`)
			.setColor(EMBED_COLORS.INFO)
			.setDescription(backupList);

		await interaction.editReply({ embeds: [embed] });
	},
};
