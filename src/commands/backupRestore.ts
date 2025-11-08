import { createReadStream } from "node:fs";
import { createGunzip } from "node:zlib";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { getExistingBackups } from "../lib/backup";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
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
				filtered.map((backup) => ({
					name: formatDateForDisplay(backup),
					value: backup.toString(),
				})),
			);
		}
	},

	async execute(interaction: ChatInputCommandInteraction) {
		const serverName = interaction.options.getString(SERVER_NAME_OPTION);
		const backupTimestamp = interaction.options.getString(BACKUP_OPTION);
		if (!serverName || !backupTimestamp) {
			await interaction.reply({
				embeds: [
					createErrorEmbed("Server name and backup timestamp are required."),
				],
			});
			return;
		}

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.reply(`No server found with the name "${serverName}".`);
			return;
		}

		const backups = await getExistingBackups(server.id);
		const backupToRestore = backups.find(
			(backup) => backup.toString() === backupTimestamp,
		);
		if (!backupToRestore) {
			await interaction.reply(
				`No backup found with the timestamp "${backupTimestamp}" for server "${serverName}".`,
			);
			return;
		}

		await interaction.reply(
			`⌛ Restoring backup for server "${serverName}"...`,
		);

		try {
			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();

			if (containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
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

			await interaction.editReply(
				`✅ Backup restored successfully for server "${serverName}".`,
			);
		} catch (error) {
			if (!(error instanceof Error)) {
				throw error;
			}
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						`Failed to restore backup for server "${serverName}": ${error.message}`,
					),
				],
			});
		}
	},
};
