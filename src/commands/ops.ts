import {
	type ChatInputCommandInteraction,
	SlashCommandBuilder,
} from "discord.js";

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
						.setRequired(true),
				),
		)
		.addSubcommand((subcommand) =>
			subcommand
				.setName(SUBCOMMANDS.ADD)
				.setDescription("Add an operator to the server")
				.addStringOption((option) =>
					option
						.setName("server-name")
						.setDescription("The name of the server")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
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
						.setName("server-name")
						.setDescription("The name of the server")
						.setRequired(true),
				)
				.addStringOption((option) =>
					option
						.setName("user-id")
						.setDescription(
							"The username of the player to remove from operators",
						)
						.setRequired(true),
				),
		),

	async execute(interaction: ChatInputCommandInteraction) {
		await interaction.deferReply();
		const subcommand = interaction.options.getSubcommand();


		switch (subcommand) {
			case SUBCOMMANDS.LIST: {
				// Implementation for listing operators
				await interaction.reply("Listing all operators...");
				break;
			}
			case SUBCOMMANDS.ADD: {
				const userId = interaction.options.getString("user-id", true);
				// Implementation for adding an operator
				await interaction.reply(`Adding operator: ${userId}`);
				break;
			}
			case SUBCOMMANDS.REMOVE: {
				const userId = interaction.options.getString("user-id", true);
				// Implementation for removing an operator
				await interaction.reply(`Removing operator: ${userId}`);
				break;
			}
			default:
				await interaction.reply("Unknown subcommand.");
		}
	},
};
