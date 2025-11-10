import { docker, filterLabelBuilder, parseLabels } from "./lib/docker";
import type { Server } from "./types/server";

/**
 * Formats a Date object into a filename-safe timestamp string.
 * Converts ISO format by replacing colons and periods with hyphens.
 * @example "2025-11-05T23:29:02.908Z" becomes "2025-11-05T23-29-02-908Z"
 */
export const formatTimestampForFilename = (date: Date): string => {
	return date.toISOString().replace(/[:.]/g, "-");
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
	const timestampStr = filename.replace(/\.tar\.gz$/, "");

	// Convert back to ISO format: "2025-11-05T23-29-02-908Z" -> "2025-11-05T23:29:02.908Z"
	const match = timestampStr.match(
		/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d+)(.*)$/,
	);
	if (!match) return null;

	const [, datePart, hour, minute, second, ms, rest] = match;
	const isoStr = `${datePart}T${hour}:${minute}:${second}.${ms}${rest}`;

	const date = new Date(isoStr);
	return Number.isNaN(date.getTime()) ? null : date;
};

export const formatDateForDisplay = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	const hour = String(date.getHours()).padStart(2, "0");
	const minute = String(date.getMinutes()).padStart(2, "0");

	return `${year}-${month}-${day} ${hour}:${minute}`;
};

export const formatUptime = (dateString: string): string => {
	const startTime = new Date(dateString);
	const now = new Date();

	// Invalid date check
	if (Number.isNaN(startTime.getTime())) {
		return "Not started";
	}

	const diffMs = now.getTime() - startTime.getTime();

	// Not started yet (future date or zero date like 0001-01-01)
	if (diffMs <= 0) {
		return "Not started";
	}

	const seconds = Math.floor(diffMs / 1000);
	const minutes = Math.floor(seconds / 60);
	const hours = Math.floor(minutes / 60);
	const days = Math.floor(hours / 24);
	const years = Math.floor(days / 365);

	if (years > 0) {
		return years === 1 ? "1 year ago" : `${years} years ago`;
	}
	if (days > 0) {
		return days === 1 ? "1 day ago" : `${days} days ago`;
	}
	if (hours > 0) {
		return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
	}
	if (minutes > 0) {
		return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
	}
	return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
};

export const getAllServers = async () => {
	const containers = await docker.listContainers({
		all: true,
		filters: {
			label: filterLabelBuilder({ managed: true }),
		},
	});
	const servers = containers.map((c) => parseLabels(c.Labels));
	return servers;
};

export const getServerByName = async (name: string): Promise<Server | null> => {
	const containers = await docker.listContainers({
		all: true,
		filters: {
			label: filterLabelBuilder({ name, managed: true }),
		},
	});
	if (!containers[0]?.Labels) return null;
	const server = parseLabels(containers[0].Labels);
	return server;
};

export const getRunningServers = async (): Promise<Server[]> => {
	const containers = await docker.listContainers({
		all: false,
		filters: {
			label: filterLabelBuilder({ managed: true }),
			status: ["running"],
		},
	});
	const servers = containers.map((c) => parseLabels(c.Labels));
	return servers;
};
