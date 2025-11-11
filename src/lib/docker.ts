import type { ContainerInfo } from "dockerode";
import Docker from "dockerode";
import { PassThrough } from "stream";
import { SERVER_DEFAULT_ICON_URL } from "../constants";
import type { Difficulty, Gamemode, Server, ServerType } from "../types/server";

const DOCKER_LABEL_PREFIX = "mc-bot";

export const docker = new Docker();

export type Labels = Partial<Server> & {
	managed?: boolean;
};

export const filterLabelBuilder = (opts: Labels): string[] => {
	const labels: string[] = [];

	for (const key of Object.keys(opts) as (keyof Labels)[]) {
		const value = opts[key];
		if (value === undefined) continue;

		switch (key) {
			case "id":
			case "ownerId":
			case "name":
			case "version":
			case "maxPlayers":
			case "difficulty":
			case "type":
			case "gamemode":
			case "description":
			case "managed":
			case "iconPath":
			case "whitelistedUserIds":
			case "opsUserIds":
			case "createdAt":
			case "updatedAt":
				labels.push(
					`${DOCKER_LABEL_PREFIX}.${key}=${value instanceof Date ? value.toISOString() : value}`,
				);
				break;
			default: {
				const _exhaustive: never = key;
				throw new Error(`Unhandled key: ${_exhaustive}`);
			}
		}
	}

	return labels;
};

export const labelBuilder = (opts: Labels): Record<string, string> => {
	return Object.fromEntries(
		Object.entries(opts)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => [
				`${DOCKER_LABEL_PREFIX}.${key}`,
				value instanceof Date ? value.toISOString() : String(value),
			]),
	);
};

export const serverEnvBuilder = (server: Server): string[] => {
	const env: string[] = [
		`EULA=TRUE`,
		`SERVER_NAME=${server.name}`,
		`VERSION=${server.version}`,
		`MAX_PLAYERS=${server.maxPlayers}`,
		`DIFFICULTY=${server.difficulty}`,
		`TYPE=${server.type}`,
		`MODE=${server.gamemode}`,
		`ICON=${server.iconPath || SERVER_DEFAULT_ICON_URL}`,
		`OVERRIDE_ICON=TRUE`,
		`MOTD=${server.description}`,
	];
	return env;
};

type ContainerLabels = ContainerInfo["Labels"];

export const parseLabels = (labels: ContainerLabels): Server => {
	const getValue = (key: keyof Server): string => {
		const labelKey = `${DOCKER_LABEL_PREFIX}.${key}`;
		const value = labels[labelKey];
		if (!value) {
			throw new Error(`Missing label: ${labelKey}`);
		}
		return value;
	};

	const server: Server = {
		id: getValue("id"),
		ownerId: getValue("ownerId"),
		name: getValue("name"),
		version: getValue("version"),
		maxPlayers: getValue("maxPlayers"),
		difficulty: getValue("difficulty") as Difficulty,
		type: getValue("type") as ServerType,
		gamemode: getValue("gamemode") as Gamemode,
		description: getValue("description"),
		createdAt: new Date(getValue("createdAt")),
		updatedAt: new Date(getValue("updatedAt")),
	};

	if (labels[`${DOCKER_LABEL_PREFIX}.iconPath`]) {
		server.iconPath = getValue("iconPath");
	}

	if (labels[`${DOCKER_LABEL_PREFIX}.whitelistedUserIds`]) {
		server.whitelistedUserIds = JSON.parse(getValue("whitelistedUserIds"));
	}

	if (labels[`${DOCKER_LABEL_PREFIX}.opsUserIds`]) {
		server.opsUserIds = JSON.parse(getValue("opsUserIds"));
	}

	return server;
};

export const execCommands = async (
	container: Docker.Container,
	cmds: string[],
): Promise<{ output: string; errorOutput: string }> => {
	const exec = await container.exec({
		Cmd: cmds,
		AttachStdout: true,
		AttachStderr: true,
	});

	const stream = await exec.start({ Detach: false });
	const stdout = new PassThrough();
	const stderr = new PassThrough();

	let output = "";
	let errorOutput = "";

	// Set up data listeners before demuxing
	stdout.on("data", (chunk) => {
		output += chunk.toString();
	});

	stderr.on("data", (chunk) => {
		errorOutput += chunk.toString();
	});

	// Demux the stream
	container.modem.demuxStream(stream, stdout, stderr);

	// Wait for stream to end
	await new Promise<void>((resolve, reject) => {
		stream.on("end", () => {
			stdout.end();
			stderr.end();
			resolve();
		});
		stream.on("error", (err) => {
			reject(err);
		});
	});

	return { output, errorOutput };
};
