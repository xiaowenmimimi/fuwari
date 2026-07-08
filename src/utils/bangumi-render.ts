import type { UserSubjectCollection } from "@/types/bangumi";

export type BangumiPageItem = number | "...";

export function escapeBangumiHtml(value: unknown) {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

// 状态映射
export function getBangumiItemStatus(item: UserSubjectCollection) {
	const statusMap = {
		1: "wish",
		2: "collect",
		3: "doing",
		4: "on_hold",
		5: "dropped",
	} as const;

	return statusMap[item.type as keyof typeof statusMap] || "unknown";
}

export function getBangumiStatusText(item: UserSubjectCollection) {
	const isGame = item.subject?.type === 4;
	const statusMap = {
		1: isGame ? "想玩" : "想看",
		2: isGame ? "玩过" : "看过",
		3: isGame ? "在玩" : "在看",
		4: "搁置",
		5: "抛弃",
	} as const;

	return statusMap[item.type as keyof typeof statusMap] || "未知";
}

export function getBangumiStatusColor(type: number) {
	const colorMap = {
		1: "bg-blue-500",
		2: "bg-green-500",
		3: "bg-yellow-500",
		4: "bg-orange-500",
		5: "bg-red-500",
	} as const;

	return colorMap[type as keyof typeof colorMap] || "bg-gray-500";
}

export function getBangumiTags(item: UserSubjectCollection) {
	const rawTags =
		Array.isArray(item.tags) && item.tags.length > 0
			? item.tags
			: item.subject?.tags?.map((tag) => tag.name) || [];
	const tags = rawTags.filter(Boolean).slice(0, 2);
	const extraTagCount = Math.max(0, rawTags.length - tags.length);

	return { tags, extraTagCount };
}

// 生成智能分页页码数组
export function generateBangumiPageNumbers(current: number, total: number) {
	const totalPages = Math.max(1, total);
	// 如果总页数小于等于7，显示所有页码
	if (totalPages <= 7) {
		return Array.from({ length: totalPages }, (_, index) => index + 1);
	}

	const delta = 2; // 当前页左右显示的页码数量
	// 计算显示范围
	const left = Math.max(2, current - delta);
	const right = Math.min(totalPages - 1, current + delta);

	const range: BangumiPageItem[] = [];
	// 始终显示第一页
	range.push(1);

	// 如果左边界大于2，添加省略号
	if (left > 2) range.push("...");

	// 添加中间页码
	for (let page = left; page <= right; page++) range.push(page);

	// 如果右边界小于最后一页-1，添加省略号
	if (right < totalPages - 1) range.push("...");

	// 始终显示最后一页（如果总页数大于1）
	if (totalPages > 1) range.push(totalPages);

	return range;
}

export function renderBangumiCardHtml(item: UserSubjectCollection) {
	const subject = item.subject || {};
	const title = subject.name_cn || subject.name || "";
	const image = subject.images?.medium || "";
	const subjectId = subject.id ? encodeURIComponent(subject.id) : "";
	const { tags, extraTagCount } = getBangumiTags(item);
	const scoreHtml = subject.score
		? `<div class="flex items-center gap-1"><div class="text-yellow-400">⭐</div><span class="text-sm">${escapeBangumiHtml(subject.score)}</span></div>`
		: "";
	const commentHtml = item.comment
		? `<div class="relative group/comment"><div class="text-sm text-gray-300 cursor-help">💬</div><div class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover/comment:opacity-100 transition-opacity duration-150 w-32 sm:w-44 xl:w-52 z-10 pointer-events-none">${escapeBangumiHtml(item.comment)}</div></div>`
		: "";
	const metaHtml =
		scoreHtml || commentHtml
			? `<div class="flex items-center justify-between mb-2">${scoreHtml}${commentHtml}</div>`
			: "";
	const tagsHtml =
		tags.length > 0
			? `<div class="flex flex-wrap gap-1">${tags.map((tag) => `<span class="px-2 py-0.5 rounded-full text-[11px] bg-white/15 text-white/90">${escapeBangumiHtml(tag)}</span>`).join("")}${extraTagCount > 0 ? `<span class="px-2 py-0.5 rounded-full text-[11px] bg-white/10 text-white/70">+${extraTagCount}</span>` : ""}</div>`
			: "";
	const imageHtml = image
		? `<img src="${escapeBangumiHtml(image)}" alt="${escapeBangumiHtml(title)}" class="w-full h-full object-cover pointer-events-none" loading="lazy" decoding="async" />`
		: `<div class="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center"><div class="text-gray-400 text-4xl">?</div></div>`;

	return `<a href="https://bgm.tv/subject/${subjectId}" target="_blank" rel="noopener noreferrer nofollow" class="bangumi-card group relative block overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-gray-800 dark:ring-white/10 dark:focus-visible:ring-offset-gray-900">
		<div class="aspect-[2/3] relative overflow-hidden">
			${imageHtml}
			<div class="absolute top-2 left-2 px-2 py-1 rounded-full text-xs text-white font-medium shadow-sm ${getBangumiStatusColor(item.type)}">${escapeBangumiHtml(getBangumiStatusText(item))}</div>
		</div>
		<div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent text-white p-3 sm:p-4 transform translate-y-0 sm:translate-y-full sm:group-hover:translate-y-0 transition-transform duration-200">
			<h3 class="font-bold text-sm mb-1 line-clamp-2">${escapeBangumiHtml(title)}</h3>
			${metaHtml}
			${tagsHtml}
		</div>
	</a>`;
}

export function renderBangumiGridItemHtml(
	item: UserSubjectCollection,
	sectionId: string,
) {
	return `<div class="bangumi-item" data-item-section="${escapeBangumiHtml(sectionId)}" data-item-status="${escapeBangumiHtml(getBangumiItemStatus(item))}">${renderBangumiCardHtml(item)}</div>`;
}
