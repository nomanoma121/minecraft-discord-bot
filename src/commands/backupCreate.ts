import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { finished } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { queries as q } from "../db/queries";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

export const backupCreate = {
	name: "backup-create",
	data: new SlashCommandBuilder()
		.setName("backup-create")
		.setDescription("Creates a backup of a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the Minecraft server to back up.")
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

			const saveoff = await container.exec({
				Cmd: ["rcon-cli", "save-off"],
				AttachStdout: true,
				AttachStderr: true,
			});
			const saveoffStream = await saveoff.start({});
			docker.modem.demuxStream(saveoffStream, process.stdout, process.stderr);
			saveoffStream.resume();
			await finished(saveoffStream);

			const saveall = await container.exec({
				Cmd: ["rcon-cli", "save-all"],
				AttachStdout: true,
				AttachStderr: true,
			});
			const saveallStream = await saveall.start({});
			docker.modem.demuxStream(saveallStream, process.stdout, process.stderr);
			saveallStream.resume();
			await finished(saveallStream);

			const timestamp = new Date()
				.toISOString()
				.replace(/[:.]/g, "-")
				.replace("T", "_");
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

			const saveon = await container.exec({
				Cmd: ["rcon-cli", "save-on"],
				AttachStdout: true,
				AttachStderr: true,
			});
			const saveonStream = await saveon.start({});
			docker.modem.demuxStream(saveonStream, process.stdout, process.stderr);
			saveonStream.resume();
			await finished(saveonStream);

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
