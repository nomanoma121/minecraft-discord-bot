import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import { getExistingBackups } from "../lib/backup";
import { docker } from "../lib/docker";
import { createErrorEmbed, createInfoEmbed } from "../lib/embed";
import { mutex } from "../lib/mutex";
import {
	formatDateForDisplay,
	formatTimestampForFilename,
	getAllServers,
	getServerByName,
} from "../utils";

const SERVER_NAME_OPTION = "server-name";
const BACKUP_OPTION = "backup";

export const backupRestore = {
	name: "backup-restore",
	data: new SlashCommandBuilder()
		.setName("backup-restore")
		.setDescription("Restores a backup of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName(SERVER_NAME_OPTION)
				.setDescription("Name of the Minecraft server to restore.")
				.setAutocomplete(true)
				.setRequired(true),
		)
		.addStringOption((option) =>
			option
				.setName(BACKUP_OPTION)
				.setDescription("Timestamp of the backup to restore.")
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
				filtered.map((server) => ({
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
		const backupTimestamp = interaction.options.getString(BACKUP_OPTION);
		if (!serverName || !backupTimestamp) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed("Server name and backup timestamp are required."),
				],
			});
			return;
		}

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(`No server found with the name "${serverName}".`),
				],
			});
			return;
		}
		if (server.ownerId !== interaction.user.id) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						`You are not the owner of server "${serverName}". Only the owner can restore a backup.`,
					),
				],
			});
			return;
		}

		const backups = await getExistingBackups(server.id);
		const backupToRestore = backups.find(
			(backup) => backup.toString() === backupTimestamp,
		);
		if (!backupToRestore) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						`No backup found with the timestamp "${backupTimestamp}" for server "${serverName}".`,
					),
				],
			});
			return;
		}

		const release = await mutex.acquire();

		try {
			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();

			if (containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Server "${serverName}" must be stopped to restore a backup.`,
						),
					],
				});
				return;
			}

			const backupFileName = `${formatTimestampForFilename(backupToRestore)}.tar.gz`;
			const backupFilePath = `/backups/${server.id}/${backupFileName}`;
			const backupStream = createReadStream(backupFilePath);
			const gunzip = createGunzip();

			await interaction.editReply("⌛ Restoring the backup...");

			await new Promise<void>((resolve, reject) => {
				backupStream.on("error", reject);
				gunzip.on("error", reject);
				backupStream.pipe(gunzip);

				container
					.putArchive(gunzip, {
						path: "/",
					})
					.then(() => resolve())
					.catch(reject);
			});

			await interaction.editReply({
				content: "",
				embeds: [
					createInfoEmbed(
						`Backup "${formatDateForDisplay(backupToRestore)}" restored successfully for server "${serverName}".`,
					),
				],
			});
		} catch (error) {
			if (!(error instanceof Error)) {
				throw error;
			}
			await interaction.editReply({
				content: "",
				embeds: [
					createErrorEmbed(
						`Failed to restore backup for server "${serverName}": ${error.message}`,
					),
				],
			});
		} finally {
			release();
		}
	},
};
