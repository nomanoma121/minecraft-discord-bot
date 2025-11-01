import { EmbedBuilder } from "discord.js";

export const createErrorEmbed = (errorMessage: string) => {
	return new EmbedBuilder()
		.setTitle("Error Occurred!!")
		.setColor(0xff0000)
		.setDescription(errorMessage);
};
