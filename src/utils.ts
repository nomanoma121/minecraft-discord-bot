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
