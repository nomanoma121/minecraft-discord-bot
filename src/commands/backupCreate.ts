import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { Config } from "../config";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import {
	getExistingBackups,
	getTotalBackupCounts,
	withSafeSave,
} from "../lib/backup";
import { docker } from "../lib/docker";
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

export const backupCreate = {
	name: "backup-create",
	data: new SlashCommandBuilder()
		.setName("backup-create")
		.setDescription("Creates a backup of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server to back up.")
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

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(`No server found with the name **${serverName}**.`),
				],
			});
			return;
		}

		const serverBackups = await getExistingBackups(server.id);
		const totalBackupCounts = await getTotalBackupCounts();
		if (
			totalBackupCounts >= Config.maxTotalBackupCount ||
			serverBackups.length >= Config.maxBackupCountPerServer
		) {
			await interaction.editReply({
				embeds: [
					createInfoEmbed(
						`Backup limit reached. Max total backups: ${Config.maxTotalBackupCount}, Max backups per server: ${Config.maxBackupCountPerServer}. Please delete old backups before creating new ones.`,
					),
				],
			});
			return;
		}

		const release = await mutex.acquire();

		try {
			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();

			if (!containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [createInfoEmbed(`Server **${serverName}** is not running.`)],
				});
				return;
			}

			await interaction.editReply("⌛ Creating backup...");

			const now = new Date();
			await withSafeSave(container, async () => {
				const timestamp = formatTimestampForFilename(now);
				const backupFileName = `${timestamp}.tar.gz`;
				const backupFilePath = `/app/data/backups/${server.id}/${backupFileName}`;

				await mkdir(`/app/data/backups/${server.id}`, { recursive: true });

				const archive = await container.getArchive({
					path: "/data",
				});
				const gzip = createGzip();
				const writeStream = createWriteStream(backupFilePath);

				await pipeline(archive, gzip, writeStream);
			});

			await interaction.editReply({
				content: "",
				embeds: [
					createSuccessEmbed(
						`Backup **${formatDateForDisplay(now)}** created successfully for server **${serverName}**.`,
					),
				],
			});
		} catch (error) {
			console.error("Error creating backup:", error);
			await interaction.editReply({
				content: "",
				embeds: [
					createErrorEmbed(
						`Failed to create backup for server **${serverName}**.`,
					),
				],
			});
		} finally {
			release();
		}
	},
};
