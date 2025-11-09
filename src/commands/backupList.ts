import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { getExistingBackups } from "../lib/backup";
import { createErrorEmbed } from "../lib/embed";
import { formatDateForDisplay, getAllServers, getServerByName } from "../utils";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";

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
		const serverName = interaction.options.getString("server-name");
		if (!serverName) {
			await interaction.reply({
				embeds: [createErrorEmbed("Server name is required.")],
			});
			return;
		}

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.reply(`No server found with the name "${serverName}".`);
			return;
		}

		const backups = await getExistingBackups(server.id);
		if (backups.length === 0) {
			await interaction.reply(`No backups found for server "${serverName}".`);
			return;
		}

		const backupList = backups
			.map((backup, i) => {
				const formattedTimestamp = formatDateForDisplay(backup);
				if (i === 0) {
					return `${formattedTimestamp} (Latest)`;
				}
				return formattedTimestamp;
			})
			.join("\n");
		await interaction.reply(
			`Backups for server "${serverName}":\n${backupList}`,
		);
	},
};
