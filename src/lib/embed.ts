import { EmbedBuilder } from "discord.js";
import { EMBED_COLORS } from "../constants";

export const createErrorEmbed = (errorMessage: string) => {
	return new EmbedBuilder()
		.setTitle("Error Occurred!!")
		.setColor(EMBED_COLORS.ERROR)
		.setDescription(errorMessage);
};
