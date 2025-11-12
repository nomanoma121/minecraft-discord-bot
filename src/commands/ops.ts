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
import type { Operator } from "../types/server";
import { getAllServers, getServerByName } from "../utils";

const SUBCOMMANDS = {
	LIST: "list",
	ADD: "add",
	REMOVE: "remove",
};

export const ops = {
	name: "ops",
	description: "Manage server operators",
	data: new SlashCommandBuilder()
		.setName("ops")
		.setDescription("Manage server operators")
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.LIST)
				.setDescription("List all operators on the server")
				.addStringOption((option) =>
					option
						.setName("server-name")
						.setDescription("The name of the server")
						.setAutocomplete(true)
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.ADD)
				.setDescription("Add an operator to the server")
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
						.setDescription("The username of the player to add as an operator")
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.REMOVE)
				.setDescription("Remove an operator from the server")
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
						.setDescription(
							"The username of the player to remove from operators",
						)
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

		const release = await mutex.acquire();

		const server = await getServerByName(serverName);
		if (!server) {
			await interaction.editReply({
				embeds: [createInfoEmbed(`Server "${serverName}" not found.`)],
			});
			return;
		}

		const username = interaction.options.getString("username");

		try {
			const container = docker.getContainer(server.id);
			const containerInfo = await container.inspect();
			if (!containerInfo.State.Running) {
				await interaction.editReply({
					embeds: [createInfoEmbed(`Server "${serverName}" is not running.`)],
				});
				return;
			}

			switch (subcommand) {
				case SUBCOMMANDS.LIST: {
					const output = await execCommands(container, [
						"cat",
						"/data/ops.json",
					]);
					const ops = JSON.parse(output || "[]") as Operator[];

					if (ops.length === 0) {
						await interaction.editReply({
							embeds: [
								createInfoEmbed(
									`No operators found on server **${serverName}**.`,
								),
							],
						});
						return;
					}

					const embed = new EmbedBuilder()
						.setTitle(`Operators for Server **${serverName}**`)
						.setColor(EMBED_COLORS.INFO)
						.setDescription(
							ops
								.map((op) => `- **${op.name}** (Level: ${op.level})`)
								.join("\n"),
						);

					await interaction.editReply({ embeds: [embed] });
					break;
				}
				case SUBCOMMANDS.ADD: {
					if (!username) {
						await interaction.editReply({
							embeds: [
								createErrorEmbed("Username is required to add an operator."),
							],
						});
						return;
					}

					await execCommands(container, ["rcon-cli", "op", username]);

					await interaction.editReply({
						embeds: [
							createSuccessEmbed(`Made **${username}** a server operator.`),
						],
					});
					break;
				}
				case SUBCOMMANDS.REMOVE: {
					if (!username) {
						await interaction.editReply({
							embeds: [
								createErrorEmbed("Username is required to remove an operator."),
							],
						});
						return;
					}

					await execCommands(container, ["rcon-cli", "deop", username]);

					await interaction.editReply({
						embeds: [
							createSuccessEmbed(
								`Removed **${username}** from server operators.`,
							),
						],
					});
					break;
				}
				default:
					await interaction.editReply({
						embeds: [createErrorEmbed("Invalid subcommand.")],
					});
			}
		} catch (error) {
			console.error("Error executing ops command:", error);
			await interaction.editReply({
				embeds: [
					createErrorEmbed(
						"An error occurred while executing the command. Please try again later.",
					),
				],
			});
		} finally {
			release();
		}
	},
};
