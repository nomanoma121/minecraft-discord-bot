import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES, EMBED_COLORS } from "../constants";
import { docker } from "../lib/docker";
import { createErrorEmbed } from "../lib/embed";

const deleteCommand = {
	name: "delete",
	data: new SlashCommandBuilder()
		.setName("delete")
		.setDescription("Deletes a Minecraft server")
		.addStringOption((option) =>
			option
				.setName("server-name")
				.setDescription("Name of the server to delete")
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

			if (server.ownerId !== interaction.user.id) {
				await interaction.editReply({
					embeds: [
						createErrorEmbed(
							`You are not the owner of server "${serverName}". Only the owner can delete this server.`,
						),
					],
				});
				return;
			}

			await interaction.editReply(
				`✅ Check server "${serverName}"\n⌛ Removing server...`,
			);

			const container = docker.getContainer(server.id);

			try {
				const containerInfo = await container.inspect();

				if (containerInfo.State.Running) {
					await container.stop();
					console.log(`Stopped container "${serverName}" before deletion.`);
				}

				await container.remove();
				console.log(`Removed Docker container "${serverName}".`);
			} catch (_error) {
				console.log(
					`Container "${serverName}" not found, continuing with cleanup.`,
				);
			}

			try {
				const volume = docker.getVolume(server.id);
				await volume.remove();
				console.log(`Removed volume "${server.id}".`);
			} catch (_error) {
				console.log(
					`Volume "${server.id}" not found, continuing with cleanup.`,
				);
			}

			await q.deleteServer(serverName);
			console.log(`Deleted server "${serverName}" from database.`);

			await interaction.editReply(
				`✅ Check server "${serverName}"\n✅ Remove server\n\n`,
			);

			const embed = new EmbedBuilder()
				.setTitle(`Minecraft Server "${serverName}" Deleted`)
				.setColor(EMBED_COLORS.SUCCESS)
				.setDescription(
					`The Minecraft server "${serverName}" has been deleted successfully.`,
				)
				.addFields(
					{ name: "Server Name", value: server.name, inline: true },
					{ name: "Version", value: server.version, inline: true },
					{ name: "Owner", value: `<@${server.ownerId}>`, inline: true },
				)
				.setFooter({ text: "All data for this server has been removed." });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			console.error("Error deleting the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while deleting the Minecraft server. Please try again later.",
					),
				],
			});
		}
	},
};

export { deleteCommand as delete };
