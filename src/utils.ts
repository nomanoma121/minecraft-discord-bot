export const formatTimestampForFilename = (date: Date): string => {
	return date
		.toISOString()
		.replace(/[:.]/g, "-")
		.replace("T", "_")
		.replace("Z", "");
};

export const parseTimestampFromFilename = (filename: string): Date | null => {
	const isoStr = filename
		.replace("_", "T")
		.replace(/-(\d{2})-(\d{2})$/, ":$1:$2");
	const date = new Date(isoStr);
	return Number.isNaN(date.getTime()) ? null : date;
};
