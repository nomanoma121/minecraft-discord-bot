import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { queries as q } from "../db/queries";
import { getExistingBackups } from "../lib/backup";
import { createErrorEmbed } from "../lib/embed";
import { parseTimestampFromFilename } from "../utils";

export const backupList = {
	name: "backup-list",
	data: new SlashCommandBuilder()
		.setName("backup")
		.setDescription("Lists all backups for a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server to list backups for.")
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

		const server = await q.getServerByName(serverName);
		if (!server) {
			await interaction.reply(`No server found with the name "${serverName}".`);
			return;
		}

		const backups = await getExistingBackups(server.id);
		if (backups.length === 0) {
			await interaction.reply(`No backups found for server "${serverName}".`);
			return;
		}


		const backupList = backups.map((file, i) => {
			const timestamp = parseTimestampFromFilename(file);
			if (!timestamp) {
				return "Invalid timestamp";
			}
			const formattedTimestamp = timestamp.toLocaleString();
			if (i === 0) {
				return `${formattedTimestamp} (Latest)`
			}
			return formattedTimestamp;
		}).join("\n");
		await interaction.reply(`Backups for server "${serverName}":\n${backupList}`);
	},
};
