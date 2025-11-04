import type {
	AutocompleteInteraction,
	ChatInputCommandInteraction,
	Collection,
} from "discord.js";

export interface Command {
	execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
	autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

declare module "discord.js" {
	export interface Client {
		commands: Collection<string, Command>;
	}
}
