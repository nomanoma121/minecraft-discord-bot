import { rm } from "node:fs/promises";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import { getExistingBackups } from "../lib/backup";
import {
	createErrorEmbed,
	createInfoEmbed,
	createSuccessEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
import {
	formatDateForDisplay,
	formatTimestampForFilename,
	getAllServers,
	getServerByName,
} from "../utils";

const SERVER_NAME_OPTION = "server-name";
const BACKUP_OPTION = "backup";

export const backupDelete = {
	name: "backup-delete",
	data: new SlashCommandBuilder()
		.setName("backup-delete")
		.setDescription("Deletes a backup for a specified Minecraft server")
		.addStringOption((option) =>
			option
				.setName(SERVER_NAME_OPTION)
				.setDescription("Name of the server")
				.setAutocomplete(true)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName(BACKUP_OPTION)
				.setDescription("The backup to delete")
				.setAutocomplete(true)
				.setRequired(true),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focused = interaction.options.getFocused(true);
		if (focused.name === SERVER_NAME_OPTION) {
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
		} else if (focused.name === BACKUP_OPTION) {
			const serverName = interaction.options.getString(SERVER_NAME_OPTION);
			if (!serverName) {
				await interaction.respond([]);
				return;
			}

			const server = await getServerByName(serverName);
			if (!server) {
				await interaction.respond([]);
				return;
			}

			const backups = await getExistingBackups(server.id);
			const focusedValue = focused.value;
			const filtered = backups.filter((backup) =>
				backup.toString().toLowerCase().startsWith(focusedValue.toLowerCase()),
			);
			await interaction.respond(
				filtered.slice(0, AUTOCOMPLETE_MAX_CHOICES).map((backup) => ({
					name: formatDateForDisplay(backup),
					value: backup.toString(),
				})),
			);
		}
	},

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();

		const serverName = interaction.options.getString(SERVER_NAME_OPTION);
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const backupTimestamp = interaction.options.getString(BACKUP_OPTION);
		if (!backupTimestamp) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Backup timestamp is required.")],
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

		if (server.ownerId !== interaction.user.id) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						`You are not the owner of server **${serverName}**. Only the owner can delete backups.`,
					),
				],
			});
			return;
		}

		const backups = await getExistingBackups(server.id);
		const backupToDelete = backups.find(
			(backup) => backup.toString() === backupTimestamp,
		);
		if (!backupToDelete) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						`No backup found with the timestamp **${backupTimestamp}** for server **${serverName}**.`,
					),
				],
			});
			return;
		}

		const release = await mutex.acquire();

		try {
			const backupFileName = `${formatTimestampForFilename(backupToDelete)}.tar.gz`;
			const backupFilePath = `/app/data/backups/${server.id}/${backupFileName}`;

			await interaction.editReply("⌛ Deleting backup...");

			await rm(backupFilePath);

			await interaction.editReply({
				content: "",
				embeds: [
					createSuccessEmbed(
						`Backup **${formatDateForDisplay(backupToDelete)}** deleted successfully for server **${serverName}**.`,
					),
				],
			});
		} catch (error) {
			console.error("Error deleting backup:", error);
			await interaction.editReply({
				content: "",
				embeds: [
					createErrorEmbed(
						`Failed to delete backup for server **${serverName}**.`,
					),
				],
			});
		} finally {
			release();
		}
	},
};
