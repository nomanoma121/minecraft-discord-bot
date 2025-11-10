import fs from "node:fs";
import { rm } from "node:fs/promises";
import { finished } from "node:stream/promises";
import type Dockerode from "dockerode";
import { BACKUPS_DIR_PATH } from "../constants.js";
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
	await finished(saveoffStream);

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
		await finished(saveonStream);
	}
};

export const getExistingBackups = async (serverId: string): Promise<Date[]> => {
	const backupsDir = `${BACKUPS_DIR_PATH}/${serverId}`;
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
	try {
		const serverDirs = await fs.promises.readdir(BACKUPS_DIR_PATH);
		let totalCount = 0;
		for (const serverId of serverDirs) {
			const serverBackupDir = `${BACKUPS_DIR_PATH}/${serverId}`;
			const stat = await fs.promises.stat(serverBackupDir);
			if (!stat.isDirectory()) continue;

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

export const deleteOldestBackups = async (serverId: string): Promise<void> => {
	const backupsDir = `${BACKUPS_DIR_PATH}/${serverId}`;
	try {
		const files = await fs.promises.readdir(backupsDir);
		const backupFiles = files.filter((file) => file.endsWith(".tar.gz")).sort();
		if (backupFiles.length === 0) return;

		const oldestBackupFile = backupFiles[0];
		const oldestBackupPath = `${backupsDir}/${oldestBackupFile}`;
		await rm(oldestBackupPath);
		console.log(`Deleted oldest backup: ${oldestBackupPath}`);
	} catch (error) {
		throw new Error(`Error deleting oldest backup: ${error}`);
	}
};
