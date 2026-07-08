import type {
	UserSubjectCollection,
	UserSubjectCollectionResponse,
} from "@/types/bangumi";
import { getBangumiItemStatus } from "@/utils/bangumi-render";

export const BANGUMI_ITEMS_PER_PAGE = 12;

export type BangumiTab = {
	id: string;
	name: string;
	count: number;
};

export type BangumiFilter = {
	value: string;
	label: string;
	count: number;
};

export type BangumiSectionData = {
	items: UserSubjectCollection[];
	filters: BangumiFilter[];
};

export type BangumiPageData = {
	activeTab: string;
	dataUpdatedAtText: string;
	itemsPerPage: number;
	tabs: BangumiTab[];
	sections: Record<string, BangumiSectionData>;
};

//////////////// Bangumi 配置 ////////////////////////
const bangumiConfig = {
	username: "xiaowen",
	apiUrl: "https://api.bgm.tv",
	// Bangumi 图片反代配置：只替换指定源站的封面地址，避免影响其他外链图片
	imageProxy: {
		enable: true,
		baseUrl: "https://bgm-img.xhwen.top",
		sourceHosts: ["lain.bgm.tv"],
	},
	categories: {
		book: false,
		anime: true,
		music: false,
		game: true,
		real: false,
	},
	// 数据获取设置
	pagination: {
		limit: 50,
		delay: 50,
		maxTotal: 1000,
	},
};
////////////////////////////////////////////////////

// 分类映射
const categoryMap = {
	book: { id: "book", name: "书籍", subjectType: 1 },
	anime: { id: "anime", name: "动画", subjectType: 2 },
	music: { id: "music", name: "音乐", subjectType: 3 },
	game: { id: "game", name: "游戏", subjectType: 4 },
	real: { id: "real", name: "三次元", subjectType: 6 },
} as const;

let cachedPageData: Promise<BangumiPageData> | null = null;

export { getBangumiItemStatus };

export function sortBangumiItems(items: UserSubjectCollection[]) {
	return [...items].sort((a, b) => {
		const aDate = a.subject?.date || "";
		const bDate = b.subject?.date || "";

		if (!aDate && !bDate) return 0;
		if (!aDate) return 1;
		if (!bDate) return -1;

		return bDate.localeCompare(aDate);
	});
}

export function getBangumiFilters(
	items: UserSubjectCollection[],
	sectionId: string,
): BangumiFilter[] {
	const statusCounts = items.reduce(
		(acc, item) => {
			const status = getBangumiItemStatus(item);
			acc[status] = (acc[status] || 0) + 1;
			return acc;
		},
		{} as Record<string, number>,
	);
	const isGameSection = sectionId === "game";

	return [
		{ value: "all", label: "全部", count: items.length },
		{
			value: "doing",
			label: isGameSection ? "在玩" : "在看",
			count: statusCounts.doing || 0,
		},
		{
			value: "collect",
			label: isGameSection ? "玩过" : "看过",
			count: statusCounts.collect || 0,
		},
		{
			value: "wish",
			label: isGameSection ? "想玩" : "想看",
			count: statusCounts.wish || 0,
		},
		{ value: "on_hold", label: "搁置", count: statusCounts.on_hold || 0 },
		{ value: "dropped", label: "抛弃", count: statusCounts.dropped || 0 },
	].filter((filter) => filter.value === "all" || filter.count > 0);
}

function getBangumiImageProxyUrl(imageUrl: string) {
	if (!imageUrl || !bangumiConfig.imageProxy.enable) return imageUrl;

	try {
		const image = new URL(imageUrl);
		if (!bangumiConfig.imageProxy.sourceHosts.includes(image.hostname)) {
			return imageUrl;
		}

		const proxyBaseUrl = bangumiConfig.imageProxy.baseUrl.replace(/\/+$/, "");
		return `${proxyBaseUrl}${image.pathname}${image.search}${image.hash}`;
	} catch {
		// API 返回异常地址时保留原值，避免图片地址转换影响页面渲染
		return imageUrl;
	}
}

function getBangumiItemWithProxiedImages(item: UserSubjectCollection) {
	const images = item.subject?.images;
	if (!images) return item;

	return {
		...item,
		subject: {
			...item.subject,
			images: {
				large: getBangumiImageProxyUrl(images.large),
				common: getBangumiImageProxyUrl(images.common),
				medium: getBangumiImageProxyUrl(images.medium),
				small: getBangumiImageProxyUrl(images.small),
				grid: getBangumiImageProxyUrl(images.grid),
			},
		},
	};
}

// 获取Bangumi数据的函数 - 支持分页获取所有数据
async function fetchBangumiData(username: string, subjectType: number) {
	try {
		const { limit, delay, maxTotal } = bangumiConfig.pagination;
		let offset = 0;
		let allData: UserSubjectCollection[] = [];
		let hasMore = true;

		while (hasMore) {
			// 检查是否超过最大获取限制
			if (maxTotal > 0 && allData.length >= maxTotal) break;

			const apiUrl = `${bangumiConfig.apiUrl}/v0/users/${username}/collections?subject_type=${subjectType}&limit=${limit}&offset=${offset}`;
			const response = await fetch(apiUrl, {
				headers: {
					"User-Agent": "YuuOuRou Blog",
					Accept: "application/json",
				},
			});

			if (!response.ok) break;

			const data = (await response.json()) as UserSubjectCollectionResponse;
			const currentBatch = (data.data || []).map(
				getBangumiItemWithProxiedImages,
			);

			if (currentBatch.length > 0) {
				allData = allData.concat(currentBatch);
				offset += limit;
				// 如果本次获取的数据少于limit，说明已经是最后一页
				if (currentBatch.length < limit) hasMore = false;
			} else {
				hasMore = false;
			}

			if (hasMore) {
				// 添加延迟避免请求过于频繁
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		return sortBangumiItems(allData);
	} catch (error) {
		console.error("[Bangumi] Failed to fetch data.", error);
		return [];
	}
}

// 获取所有启用分类的数据
async function loadBangumiPageData(): Promise<BangumiPageData> {
	const sections: Record<string, BangumiSectionData> = {};
	const tabs: BangumiTab[] = [];

	for (const [categoryKey, enabled] of Object.entries(
		bangumiConfig.categories,
	)) {
		const categoryInfo = categoryMap[categoryKey as keyof typeof categoryMap];
		if (!enabled || !categoryInfo) continue;

		const items = await fetchBangumiData(
			bangumiConfig.username,
			categoryInfo.subjectType,
		);
		sections[categoryKey] = {
			items,
			filters: getBangumiFilters(items, categoryKey),
		};
		tabs.push({
			id: categoryKey,
			name: categoryInfo.name,
			count: items.length,
		});
	}

	return {
		activeTab: tabs[0]?.id || "anime",
		dataUpdatedAtText: new Intl.DateTimeFormat("zh-CN", {
			dateStyle: "medium",
			timeStyle: "short",
			hour12: false,
		}).format(new Date()),
		itemsPerPage: BANGUMI_ITEMS_PER_PAGE,
		tabs,
		sections,
	};
}

export function getBangumiPageData() {
	cachedPageData ??= loadBangumiPageData();
	return cachedPageData;
}
