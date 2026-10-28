export type MemosConfig = {
	serverURL: string;
	creator: string;
	publicationTag: string;
	pageSize: number;
};

export type MemosImage = {
	src: string;
	thumbnail: string;
	alt: string;
	width?: number;
	height?: number;
};

export type MemosMoment = {
	id: string;
	title: string;
	content: string;
	published: Date;
	updated: Date;
	tags: string[];
	pinned: boolean;
	location: string;
	images: MemosImage[];
};

export function safeMemosURL(
	value: string,
	base: string,
	allowMail = false,
): string | null {
	if (!value.trim()) return null;
	try {
		const parsed = new URL(value, base);
		if (parsed.username || parsed.password) return null;
		if (
			parsed.protocol !== "https:" &&
			parsed.protocol !== "http:" &&
			!(allowMail && parsed.protocol === "mailto:")
		)
			return null;
		return parsed.href;
	} catch {
		return null;
	}
}

export function getMemosOverview(moments: MemosMoment[]) {
	const counts = new Map<string, number>();
	let latest: Date | undefined;
	for (const moment of moments) {
		for (const tag of moment.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
		const date =
			moment.updated > moment.published ? moment.updated : moment.published;
		if (!latest || date > latest) latest = date;
	}
	return {
		total: moments.length,
		latest,
		tags: [...counts]
			.map(([name, count]) => ({ name, count }))
			.sort((a, b) => a.name.localeCompare(b.name, "zh-CN")),
	};
}

export function paginateMemos(
	moments: MemosMoment[],
	page: number,
	pageSize: number,
	tag = "",
) {
	const filtered = tag
		? moments.filter((moment) => moment.tags.includes(tag))
		: moments;
	const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
	const currentPage = Math.min(
		Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1),
		totalPages,
	);
	return {
		items: filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
		currentPage,
		totalPages,
	};
}
