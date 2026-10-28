const MOMENT_TIME_ZONE = "Asia/Shanghai";

const dateFormats = {
	date: { year: "numeric", month: "long", day: "numeric" },
	shortDate: { year: "numeric", month: "numeric", day: "numeric" },
	dateTime: {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	},
} satisfies Record<string, Intl.DateTimeFormatOptions>;

type MomentDateFormat = keyof typeof dateFormats;
const formatters = new Map<string, Intl.DateTimeFormat>();

function getFormatter(format: MomentDateFormat, locale: string) {
	const normalizedLocale = locale.replace("_", "-");
	const key = `${normalizedLocale}:${format}`;
	let formatter = formatters.get(key);
	if (!formatter) {
		formatter = new Intl.DateTimeFormat(normalizedLocale, {
			...dateFormats[format],
			timeZone: MOMENT_TIME_ZONE,
		});
		formatters.set(key, formatter);
	}
	return formatter;
}

export function formatMomentDate(
	date: Date,
	format: MomentDateFormat = "date",
	locale = "zh-CN",
): string {
	return getFormatter(format, locale).format(date);
}

function calendarParts(date: Date) {
	const parts = getFormatter("shortDate", "zh-CN").formatToParts(date);
	const value = (type: Intl.DateTimeFormatPartTypes) =>
		parts.find((part) => part.type === type)?.value || "";
	return { year: value("year"), month: value("month"), day: value("day") };
}

export function formatMomentOverviewDate(date: Date, now = new Date()): string {
	if (!Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime()))
		return "";
	const published = calendarParts(date);
	const current = calendarParts(now);
	return `${published.year === current.year ? "" : `${published.year}年`}${published.month}月${published.day}日`;
}

export function formatMomentPublicationDate(
	date: Date,
	now = new Date(),
): string {
	if (!Number.isFinite(date.getTime()) || !Number.isFinite(now.getTime()))
		return "";
	const elapsed = now.getTime() - date.getTime();
	if (elapsed < 0) return "刚刚";
	if (elapsed < 60_000) return `${Math.round(elapsed / 1_000)} 秒前`;
	if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} 分钟前`;
	if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)} 小时前`;
	if (elapsed < 8 * 86_400_000)
		return `${Math.floor(elapsed / 86_400_000)} 天前`;
	const { year, month, day } = calendarParts(date);
	return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
