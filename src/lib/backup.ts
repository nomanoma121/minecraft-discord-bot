import fs from "node:fs";
import { finished } from "node:stream/promises";
import type Dockerode from "dockerode";
import { parseTimestampFromFilename } from "../utils.js";
import { docker } from "./docker.js";

/**
 * Executes save-off, save-all, and save-on commands around a callback to ensure
 * Minecraft server data integrity during backup operations.
 * Automatically re-enables saves even if the callback throws an error.
 * @param container - The Docker container running the Minecraft server
 * @param callback - The backup operation to perform while saves are disabled
 */
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

export const getExistingBackups = async (serverId: string): Promise<Date[]> => {
	const backupsDir = `/backups/${serverId}`;
	try {
		const files = await fs.promises.readdir(backupsDir);
		const filtered = files
			.filter((file) => file.endsWith(".tar.gz"))
			.sort()
			.reverse();
		return filtered
			.map(parseTimestampFromFilename)
			.filter((date): date is Date => date !== null);
	} catch (error) {
		console.error("Error reading backups directory:", error);
		return [];
	}
};

export const getTotalBackupCounts = async (): Promise<number> => {
	const backupsRootDir = `/backups`;
	try {
		const serverDirs = await fs.promises.readdir(backupsRootDir);
		let totalCount = 0;
		for (const serverId of serverDirs) {
			const serverBackupDir = `${backupsRootDir}/${serverId}`;
			const files = await fs.promises.readdir(serverBackupDir);
			const backupFiles = files.filter((file) => file.endsWith(".tar.gz"));
			totalCount += backupFiles.length;
		}
		return totalCount;
	} catch (error) {
		console.error("Error reading backups directory:", error);
		return 0;
	}
};
