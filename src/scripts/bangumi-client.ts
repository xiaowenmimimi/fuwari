import type { BangumiPageData } from "../utils/bangumi-data";
import {
	escapeBangumiHtml,
	generateBangumiPageNumbers,
	getBangumiItemStatus,
	renderBangumiGridItemHtml,
} from "../utils/bangumi-render";

type RenderOptions = {
	animate?: boolean;
	scroll?: boolean;
};

let dataPromise: Promise<BangumiPageData> | null = null;
let bangumiData: BangumiPageData | null = null;

function getRoot() {
	return document.querySelector("[data-bangumi-root]") as HTMLElement | null;
}

function getSection(root: HTMLElement, sectionId: string) {
	return root.querySelector(`[data-section="${CSS.escape(sectionId)}"]`);
}

async function loadData(root: HTMLElement) {
	if (bangumiData) return bangumiData;
	if (!dataPromise) {
		const dataUrl = root.dataset.bangumiDataUrl;
		if (!dataUrl) throw new Error("Bangumi data URL is missing.");
		dataPromise = fetch(dataUrl, { headers: { Accept: "application/json" } })
			.then((response) => {
				if (!response.ok) {
					throw new Error(`Bangumi data failed: ${response.status}`);
				}
				return response.json() as Promise<BangumiPageData>;
			})
			.then((data) => {
				bangumiData = data;
				return data;
			});
	}
	return dataPromise;
}

function updateTabButtons(root: HTMLElement, sectionId: string) {
	for (const button of root.querySelectorAll<HTMLElement>("[data-tab]")) {
		const isActive = button.dataset.tab === sectionId;
		button.classList.toggle("border-[var(--primary)]", isActive);
		button.classList.toggle("text-[var(--primary)]", isActive);
		button.classList.toggle("border-transparent", !isActive);
		button.classList.toggle("text-gray-500", !isActive);
		button.classList.toggle("hover:text-gray-700", !isActive);
		button.classList.toggle("hover:border-gray-300", !isActive);
		button.classList.toggle("dark:text-gray-400", !isActive);
		button.classList.toggle("dark:hover:text-gray-300", !isActive);
		button.setAttribute("aria-selected", isActive ? "true" : "false");
	}
}

function updateFilterButtons(
	root: HTMLElement,
	sectionId: string,
	currentFilters: Map<string, string>,
) {
	const currentFilter = currentFilters.get(sectionId) || "all";
	for (const button of root.querySelectorAll<HTMLElement>(
		`[data-section="${CSS.escape(sectionId)}"][data-filter]`,
	)) {
		const isActive = button.dataset.filter === currentFilter;
		button.classList.toggle("bg-[var(--primary)]", isActive);
		button.classList.toggle("text-white", isActive);
		button.classList.toggle("shadow-md", isActive);
		button.classList.toggle("bg-gray-100", !isActive);
		button.classList.toggle("text-gray-700", !isActive);
		button.classList.toggle("hover:bg-gray-200", !isActive);
		button.classList.toggle("dark:bg-gray-700", !isActive);
		button.classList.toggle("dark:text-gray-300", !isActive);
		button.classList.toggle("dark:hover:bg-gray-600", !isActive);
		button.setAttribute("aria-pressed", isActive ? "true" : "false");
	}
}

function updatePagination(
	root: HTMLElement,
	sectionId: string,
	currentPage: number,
	totalPages: number,
	totalItems: number,
) {
	const pagination = root.querySelector<HTMLElement>(
		`[data-pagination-section="${CSS.escape(sectionId)}"]`,
	);
	if (!pagination) return;

	pagination.dataset.currentPage = String(currentPage);
	pagination.dataset.totalItems = String(totalItems);
	pagination.classList.toggle("hidden", totalPages <= 1);

	// 更新移动端页码显示
	for (const item of pagination.querySelectorAll(".mobile-current-page")) {
		item.textContent = String(currentPage);
	}
	for (const item of pagination.querySelectorAll(".mobile-total-pages")) {
		item.textContent = String(totalPages);
	}

	// 获取桌面端和移动端所有的 prev 和 next 按钮
	for (const button of pagination.querySelectorAll<HTMLButtonElement>(
		'[data-page="prev"]',
	)) {
		button.disabled = currentPage <= 1;
	}
	for (const button of pagination.querySelectorAll<HTMLButtonElement>(
		'[data-page="next"]',
	)) {
		button.disabled = currentPage >= totalPages;
	}

	const pageNumbersContainer = pagination.querySelector(
		`[data-page-numbers="${CSS.escape(sectionId)}"]`,
	);
	if (!pageNumbersContainer) return;

	// 生成智能分页页码数组的JavaScript版本
	pageNumbersContainer.innerHTML = generateBangumiPageNumbers(
		currentPage,
		totalPages,
	)
		.map((pageItem) => {
			if (pageItem === "...") {
				return `<span class="px-2 py-2 text-sm text-gray-500 dark:text-gray-400">...</span>`;
			}
			const isActive = pageItem === currentPage;
			const activeClass = "bg-blue-500 text-white shadow-md";
			const idleClass =
				"bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600";
			return `<button type="button" class="px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${isActive ? activeClass : idleClass}" data-page="${pageItem}" data-section="${escapeBangumiHtml(sectionId)}" aria-label="第 ${pageItem} 页" ${isActive ? 'aria-current="page"' : ""}>${pageItem}</button>`;
		})
		.join("");
}

async function renderSection(
	root: HTMLElement,
	sectionId: string,
	currentPages: Map<string, number>,
	currentFilters: Map<string, string>,
	options: RenderOptions = {},
) {
	const data = await loadData(root);
	const sectionData = data.sections?.[sectionId];
	const section = getSection(root, sectionId);
	if (!(section instanceof HTMLElement) || !sectionData) return;

	const grid = section.querySelector<HTMLElement>(
		`[data-bangumi-grid="${CSS.escape(sectionId)}"]`,
	);
	const empty = section.querySelector<HTMLElement>(
		`[data-bangumi-empty="${CSS.escape(sectionId)}"]`,
	);
	const itemsPerPage = Number(
		section.dataset.itemsPerPage || data.itemsPerPage || 12,
	);
	const filter = currentFilters.get(sectionId) || "all";
	const filteredItems = (sectionData.items || []).filter(
		(item) => filter === "all" || getBangumiItemStatus(item) === filter,
	);
	const totalPages = Math.max(
		1,
		Math.ceil(filteredItems.length / itemsPerPage),
	);
	const currentPage = Math.min(
		Math.max(1, currentPages.get(sectionId) || 1),
		totalPages,
	);
	currentPages.set(sectionId, currentPage);

	const start = (currentPage - 1) * itemsPerPage;
	const pageItems = filteredItems.slice(start, start + itemsPerPage);

	if (grid) {
		grid.innerHTML = pageItems
			.map((item) => renderBangumiGridItemHtml(item, sectionId))
			.join("");
		grid.dataset.loaded = "true";
		grid.classList.toggle("hidden", pageItems.length === 0);
		if (options.animate !== false) {
			grid.classList.remove("fade-in-up");
			void grid.offsetWidth;
			grid.classList.add("fade-in-up");
		}
	}

	if (empty) empty.classList.toggle("hidden", pageItems.length > 0);

	updateFilterButtons(root, sectionId, currentFilters);
	updatePagination(
		root,
		sectionId,
		currentPage,
		totalPages,
		filteredItems.length,
	);

	if (options.scroll) {
		const y = section.getBoundingClientRect().top + window.pageYOffset - 80;
		window.scrollTo({ top: y, behavior: "smooth" });
	}
}

async function showSection(
	root: HTMLElement,
	sectionId: string,
	currentPages: Map<string, number>,
	currentFilters: Map<string, string>,
) {
	root.dataset.activeSection = sectionId;
	updateTabButtons(root, sectionId);

	for (const section of root.querySelectorAll<HTMLElement>("[data-section]")) {
		section.classList.toggle("hidden", section.dataset.section !== sectionId);
	}

	const section = getSection(root, sectionId);
	const grid = section?.querySelector(
		`[data-bangumi-grid="${CSS.escape(sectionId)}"]`,
	);
	if (!(grid instanceof HTMLElement) || grid.dataset.loaded !== "true") {
		// 添加渐显动画
		await renderSection(root, sectionId, currentPages, currentFilters, {
			animate: true,
		});
	}
}

export function setupBangumiClient() {
	const root = getRoot();
	if (!root || root.dataset.bangumiClientReady === "true") return;
	root.dataset.bangumiClientReady = "true";

	let activeSectionId = root.dataset.activeSection || "";
	const currentPages = new Map<string, number>();
	const currentFilters = new Map<string, string>();

	for (const section of root.querySelectorAll<HTMLElement>("[data-section]")) {
		const sectionId = section.dataset.section;
		if (!sectionId) continue;
		currentPages.set(sectionId, Number(section.dataset.currentPage || "1"));
		currentFilters.set(sectionId, section.dataset.currentFilter || "all");
	}

	root.addEventListener("click", async (event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;

		const tabButton = target.closest<HTMLElement>("[data-tab]");
		if (tabButton) {
			activeSectionId = tabButton.dataset.tab || activeSectionId;
			await showSection(root, activeSectionId, currentPages, currentFilters);
			return;
		}

		const filterButton = target.closest<HTMLElement>(
			"[data-filter][data-section]",
		);
		if (filterButton) {
			const sectionId = filterButton.dataset.section;
			if (!sectionId) return;
			currentFilters.set(sectionId, filterButton.dataset.filter || "all");
			currentPages.set(sectionId, 1);
			await renderSection(root, sectionId, currentPages, currentFilters, {
				animate: true,
			});
			return;
		}

		const pageButton = target.closest<HTMLButtonElement>(
			"[data-page][data-section]",
		);
		if (pageButton) {
			const sectionId = pageButton.dataset.section;
			if (!sectionId) return;
			const currentPage = currentPages.get(sectionId) || 1;
			const pageValue = pageButton.dataset.page;
			if (pageValue === "prev") {
				currentPages.set(sectionId, Math.max(1, currentPage - 1));
			} else if (pageValue === "next") {
				currentPages.set(sectionId, currentPage + 1);
			} else {
				currentPages.set(sectionId, Number(pageValue) || 1);
			}
			await renderSection(root, sectionId, currentPages, currentFilters, {
				animate: true,
				scroll: true,
			});
		}
	});
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", setupBangumiClient, {
		once: true,
	});
} else {
	setupBangumiClient();
}

document.addEventListener("astro:page-load", setupBangumiClient);

const swup = (
	window as Window & {
		swup?: { hooks?: { on: (event: string, handler: () => void) => void } };
	}
).swup;
if (swup?.hooks) {
	swup.hooks.on("page:view", setupBangumiClient);
}
