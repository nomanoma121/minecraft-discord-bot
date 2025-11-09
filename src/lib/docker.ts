import type { ContainerInfo } from "dockerode";
import Docker from "dockerode";
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
		Object.entries(opts).map(([key, value]) => [
			`${DOCKER_LABEL_PREFIX}.${key}`,
			value instanceof Date ? value.toISOString() : String(value),
		]),
	);
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

	return {
		id: getValue("id"),
		ownerId: getValue("ownerId"),
		name: getValue("name"),
		version: getValue("version"),
		maxPlayers: Number(getValue("maxPlayers")),
		difficulty: getValue("difficulty") as Difficulty,
		type: getValue("type") as ServerType,
		gamemode: getValue("gamemode") as Gamemode,
		description: getValue("description"),
		createdAt: new Date(getValue("createdAt")),
		updatedAt: new Date(getValue("updatedAt")),
	};
};
