import { rm } from "node:fs/promises";
import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES } from "../constants";
import { docker, filterLabelBuilder, parseLabels } from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createSuccessEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
import { getAllServers } from "../utils";

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
			await interaction.reply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		await interaction.reply(`⌛ Checking server "${serverName}"...`);

		const release = await mutex.acquire();

		try {
			const containers = await docker.listContainers({
				all: true,
				filters: {
					label: filterLabelBuilder({ managed: true, name: serverName }),
				},
			});
			const container = containers[0];
			if (!container) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(`No server found with the name "${serverName}".`),
					],
				});
				return;
			}

			const server = parseLabels(container.Labels);
			if (server.ownerId !== interaction.user.id) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`You are not the owner of server "${serverName}". Only the owner can delete this server.`,
						),
					],
				});
				return;
			}

			if (container.State === "running") {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Server "${serverName}" is currently running. Please stop the server before deleting it.`,
						),
					],
				});
				return;
			}

			const containerInstance = docker.getContainer(container.Id);

			await containerInstance.remove({ v: true });
			await rm(`/backups/${server.id}`, { recursive: true, force: true });

			await interaction.editReply({
				embeds: [
					createSuccessEmbed(
						`Minecraft server "${serverName}" deleted successfully.`,
					),
				],
			});
		} catch (error) {
			console.error("Error deleting the Minecraft server:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while deleting the Minecraft server. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};

export { deleteCommand as delete };
