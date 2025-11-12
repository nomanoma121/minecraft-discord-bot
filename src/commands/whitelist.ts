import {
	type AutocompleteInteraction,
	type ChatInputCommandInteraction,
	EmbedBuilder,
	SlashCommandBuilder,
} from "discord.js";
import { AUTOCOMPLETE_MAX_CHOICES, EMBED_COLORS, OPTIONS } from "../constants";
import { docker, execCommands } from "../lib/docker";
import {
	createErrorEmbed,
	createInfoEmbed,
	createSuccessEmbed,
} from "../lib/embed";
import { mutex } from "../lib/mutex";
import type { Whitelist } from "../types/server";
import { getAllServers, getServerByName } from "../utils";

const SUBCOMMANDS = {
	LIST: "list",
	ADD: "add",
	REMOVE: "remove",
};

export const whitelist = {
	name: "whitelist",
	description: "Enable or disable the server whitelist",
	data: new SlashCommandBuilder()
		.setName("whitelist")
		.setDescription("Enable or disable the server whitelist")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.LIST)
				.setDescription("List all players on the whitelist")
				.addStringOption((option) =>
					option
						.setName(OPTIONS.SERVER_NAME)
						.setDescription("The name of the server")
						.setAutocomplete(true)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.ADD)
				.setDescription("Add a player to the whitelist")
				.addStringOption((option) =>
					option
						.setName(OPTIONS.SERVER_NAME)
						.setDescription("The name of the server")
						.setAutocomplete(true)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The username of the player to add")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.REMOVE)
				.setDescription("Remove a player from the whitelist")
				.addStringOption((option) =>
					option
						.setName(OPTIONS.SERVER_NAME)
						.setDescription("The name of the server")
						.setAutocomplete(true)
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("username")
						.setDescription("The username of the player to remove")
						.setRequired(true),
				),
		),

	async autocomplete(interaction: AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);
		if (focusedOption.name === OPTIONS.SERVER_NAME) {
			const servers = await getAllServers();
			const filtered = servers.filter((server) =>
				server.name.toLowerCase().startsWith(focusedOption.value.toLowerCase()),
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
		await interaction.deferReply();

		const subcommand = interaction.options.getSubcommand();
		const serverName = interaction.options.getString(OPTIONS.SERVER_NAME);
		if (!serverName) {
			await interaction.editReply({
				embeds: [createInfoEmbed("Server name is required.")],
			});
			return;
		}

		const username = interaction.options.getString("username");

		const release = await mutex.acquire();

		try {
			const server = await getServerByName(serverName);
			if (!server) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Server with name **${serverName}** does not exist.`,
						),
					],
				});
				return;
			}

			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();
			if (!containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [
						createInfoEmbed(
							`Server **${serverName}** is not running. Please start the server first.`,
						),
					],
				});
				return;
			}

			switch (subcommand) {
				case SUBCOMMANDS.LIST: {
					const output = await execCommands(container, [
						"cat",
						"/data/whitelist.json",
					]);
					const whitelist = JSON.parse(output) as Whitelist[];

					if (whitelist.length === 0) {
						await interaction.editReply({
							embeds: [createInfoEmbed("The whitelist is currently empty.")],
						});
						return;
					}

					const embed = new EmbedBuilder()
						.setTitle(`Whitelist for Server **${serverName}**`)
						.setColor(EMBED_COLORS.INFO)
						.setDescription(
							whitelist.map((entry) => `- **${entry.name}**`).join("\n"),
						);

					await interaction.editReply({ embeds: [embed] });
					break;
				}
				case SUBCOMMANDS.ADD: {
					if (!username) {
						await interaction.editReply({
							embeds: [createInfoEmbed("Username is required.")],
						});
						return;
					}
					await execCommands(container, [
						"rcon-cli",
						"whitelist",
						"add",
						username,
					]);
					await interaction.editReply({
						embeds: [
							createSuccessEmbed(`Added **${username}** to the whitelist.`),
						],
					});
					break;
				}
				case SUBCOMMANDS.REMOVE: {
					if (!username) {
						await interaction.editReply({
							embeds: [createInfoEmbed("Username is required.")],
						});
						return;
					}
					await execCommands(container, [
						"rcon-cli",
						"whitelist",
						"remove",
						username,
					]);
					await interaction.editReply({
						embeds: [
							createSuccessEmbed(`Removed **${username}** from the whitelist.`),
						],
					});
					break;
				}
			}
		} catch (error) {
			console.error("Error executing whitelist command:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while executing the whitelist command.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
