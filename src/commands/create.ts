import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { docker } from "../lib/docker";

export const create = {
  name: "start",
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("Starts the Minecraft server"),

  async execute(interaction: CommandInteraction) {
    await interaction.reply("Starting the Minecraft server...");

    try {
      const container = await docker.createContainer({
        name: "minecraft-server",
        Image: "itzg/minecraft-server",
        Env: [
          "EULA=TRUE",
        ],
        HostConfig: {
          PortBindings: {
            "25565/tcp": [{ HostPort: "25565" }]
          }
        },
        ExposedPorts: {
          "25565/tcp": {}
        }
      });
      console.log("Minecraft server container created.");
      await container.start();
      console.log("Minecraft server started.");
      await interaction.editReply("Minecraft server started successfully!");
    } catch (error) {
      console.error("Error starting the Minecraft server:", error);
      await interaction.editReply("Failed to start the Minecraft server.");
    }
  }
}
