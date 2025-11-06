import { finished } from "node:stream/promises";
import type Dockerode from "dockerode";
import { docker } from "./docker.js";
import path from "node:path";
import fs from "node:fs";

export const withSafeSave = async (
	container: Dockerode.Container,
	callback: () => Promise<void>,
) => {
	const saveoff = await container.exec({
		Cmd: ["rcon-cli", "save-off"],
		AttachStdout: true,
		AttachStderr: true,
	});
	const saveoffStream = await saveoff.start({});
	docker.modem.demuxStream(saveoffStream, process.stdout, process.stderr);
	saveoffStream.resume();
	await new Promise((resolve, reject) => {
		saveoffStream.on("end", resolve);
		saveoffStream.on("error", reject);
	});

	const saveall = await container.exec({
		Cmd: ["rcon-cli", "save-all"],
		AttachStdout: true,
		AttachStderr: true,
	});
	const saveallStream = await saveall.start({});
	docker.modem.demuxStream(saveallStream, process.stdout, process.stderr);
	saveallStream.resume();
	await finished(saveallStream);

	try {
		await callback();
	} finally {
		const saveon = await container.exec({
			Cmd: ["rcon-cli", "save-on"],
			AttachStdout: true,
			AttachStderr: true,
		});
		const saveonStream = await saveon.start({});
		docker.modem.demuxStream(saveonStream, process.stdout, process.stderr);
		saveonStream.resume();
		await new Promise((resolve, reject) => {
			saveonStream.on("end", resolve);
			saveonStream.on("error", reject);
		});
	}
};

export const getExistingBackups = async (serverId: string): Promise<string[]> => {
	const backupsDir = path.join(__dirname, "../backups", serverId);
	try {
		const files = await fs.promises.readdir(backupsDir);
		return files.filter((file) => file.endsWith(".tar.gz"));
	} catch (error) {
		console.error("Error reading backups directory:", error);
		return [];
	}
};
