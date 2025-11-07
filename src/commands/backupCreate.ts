import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { createGzip } from "node:zlib";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { Config } from "../config";
import { queries as q } from "../db/queries";
import {
	getExistingBackups,
	getTotalBackupCounts,
	withSafeSave,
} from "../lib/backup";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";
import { formatTimestampForFilename } from "../utils";

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
		const servers = await q.getAllServers();
		const filtered = servers.filter((server) =>
			server.name.toLowerCase().startsWith(focusedValue.toLowerCase()),
		);
		await interaction.respond(
			filtered.map((server) => ({
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

		const server = await q.getServerByName(serverName);
		if (!server) {
			await interaction.reply({
				embeds: [
					createErrorEmbed(`No server found with the name "${serverName}".`),
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
			await interaction.reply({
				embeds: [
					createErrorEmbed(
						`Backup limit reached. Max total backups: ${Config.maxTotalBackupCount}, Max backups per server: ${Config.maxBackupCountPerServer}. Please delete old backups before creating new ones.`,
					),
				],
			});
			return;
		}

		await interaction.reply(`⌛ Creating backup for server "${serverName}"...`);

		try {
			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();

			if (!containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [createErrorEmbed(`Server "${serverName}" is not running.`)],
				});
				return;
			}

			await withSafeSave(container, async () => {
				const timestamp = formatTimestampForFilename(new Date());
				const backupFileName = `${timestamp}.tar.gz`;
				const backupFilePath = `/backups/${server.id}/${backupFileName}`;

				await mkdir(`/backups/${server.id}`, { recursive: true });

				const archive = await container.getArchive({
					path: "/data",
				});
				await new Promise<void>((resolve, reject) => {
					const gzip = createGzip();
					const writeStream = createWriteStream(backupFilePath);

					archive.pipe(gzip).pipe(writeStream);

					writeStream.on("finish", () => resolve());
					writeStream.on("error", (err) => reject(err));
				});
			});

			await interaction.editReply(
				`✅ Backup for server "${serverName}" created successfully.`,
			);
		} catch (error) {
			console.error("Error creating backup:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						`Failed to create backup for server "${serverName}".`,
					),
				],
			});
			return;
		}
	},
};
