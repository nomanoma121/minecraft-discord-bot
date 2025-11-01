import type { Collection, CommandInteraction } from "discord.js";

declare module "discord.js" {
	export interface Client {
		commands: Collection<
			string,
			(interaction: CommandInteraction) => Promise<void>
		>;
	}
}
