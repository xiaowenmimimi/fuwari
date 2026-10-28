import {
	fetchMemosMoment,
	type MemosFeedSnapshot,
	streamMemosMoments,
} from "../utils/memos-api";
import {
	getMemosOverview,
	type MemosConfig,
	type MemosMoment,
	paginateMemos,
} from "../utils/memos-utils";
import {
	formatMomentDate,
	formatMomentOverviewDate,
	formatMomentPublicationDate,
} from "../utils/moment-date-utils";
import { getMemosFeedUrl, getMemosMomentUrl } from "../utils/url-utils";
import { renderCard } from "./memos-card";
import { cloneTemplate, query } from "./memos-dom";

type ActivePage = {
	root: HTMLElement;
	detail: boolean;
	key: string;
	config: MemosConfig;
	controller: AbortController;
	feed?: MemosFeedSnapshot;
	renderedMoments?: MemosMoment[];
	feedLoading: boolean;
	dateRefreshTimer?: number;
};
let active: ActivePage | undefined;
let feedSnapshot: { config: string; feed: MemosFeedSnapshot } | undefined;
const locationKey = () =>
	`${window.location.pathname}${window.location.search}`;

function notifyContent(root: HTMLElement) {
	root.dispatchEvent(
		new CustomEvent("moments:content-ready", { bubbles: true }),
	);
}

function deferComments(root: HTMLElement) {
	const comments = root.querySelector<HTMLElement>("[data-memos-comments]");
	if (comments) comments.hidden = true;
	const waline = root.querySelector<HTMLElement>("#waline");
	if (waline) {
		waline.dataset.walineDeferred = "true";
		delete waline.dataset.walinePath;
	}
}

function showStatus(
	page: ActivePage,
	title: string,
	description: string,
	retry = false,
	state = retry ? "error" : "empty",
) {
	const status = query(page.root, "[data-memos-status]");
	status.hidden = false;
	status.dataset.state = state;
	query(page.root, "[data-memos-status-title]").textContent = title;
	query(page.root, "[data-memos-status-description]").textContent = description;
	query(page.root, "[data-memos-retry]").hidden = !retry;
	query(page.root, "[data-memos-clear-filter]").hidden = true;
	query(page.root, "[data-memos-cards]").setAttribute("aria-busy", "false");
}

function setPageTitle(page: ActivePage, title: string) {
	document.title = `${title} - ${page.root.dataset.siteTitle || ""}`;
}

function makeFeedLink(
	tag: string,
	page: number,
	label: string,
): HTMLAnchorElement {
	const link = document.createElement("a");
	link.href = getMemosFeedUrl(tag, page);
	link.textContent = label;
	return link;
}

function renderPagination(
	page: ActivePage,
	current: number,
	total: number,
	tag: string,
) {
	const root = query(page.root, "[data-memos-pagination]");
	root.replaceChildren();
	if (total <= 1) return;
	const nav = cloneTemplate<HTMLElement>(
		page.root,
		"[data-memos-pagination-template]",
	);
	for (const [selector, target, disabled] of [
		["[data-memos-prev]", current - 1, current === 1],
		["[data-memos-next]", current + 1, current === total],
	] as const) {
		const link = query<HTMLAnchorElement>(nav, selector);
		link.href = getMemosFeedUrl(tag, target);
		if (disabled) {
			link.setAttribute("aria-disabled", "true");
			link.tabIndex = -1;
			link.removeAttribute("href");
		}
	}
	const numbers = query(nav, "[data-memos-page-numbers]");
	for (let value = 1; value <= total; value++) {
		if (Math.abs(value - current) > 1) continue;
		const link = makeFeedLink(tag, value, String(value));
		link.setAttribute("aria-label", `第 ${value} 页`);
		if (value === current) {
			link.setAttribute("aria-current", "page");
		}
		numbers.append(link);
	}
	root.append(nav);
}

function renderFeed(page: ActivePage) {
	if (!page.feed) return;
	const complete = page.feed.complete;
	const params = new URLSearchParams(window.location.search);
	const requestedTag = params.get("tag") || "";
	const tag = requestedTag === page.config.publicationTag ? "" : requestedTag;
	const feed = paginateMemos(
		page.feed.moments,
		Number(params.get("page") || 1),
		page.config.pageSize,
		tag,
	);
	const overview = getMemosOverview(page.feed.moments);
	query(page.root, "[data-memos-total]").textContent = String(overview.total);
	query(page.root, "[data-memos-total-label]").textContent = complete
		? "动态数量"
		: "已加载";
	query(page.root, "[data-memos-latest-label]").textContent = complete
		? "最近更新"
		: "已加载最新";
	const latest = query<HTMLTimeElement>(page.root, "[data-memos-latest]");
	latest.textContent = overview.latest
		? formatMomentOverviewDate(overview.latest)
		: "暂无动态";
	if (overview.latest) {
		latest.dateTime = overview.latest.toISOString();
		latest.title = formatMomentDate(overview.latest, "dateTime");
	} else {
		latest.removeAttribute("datetime");
		latest.removeAttribute("title");
	}
	const filters = query(page.root, "[data-memos-filters]");
	filters.replaceChildren();
	const visibleTags = overview.tags.filter(
		(tag) => tag.name !== page.config.publicationTag,
	);
	filters.hidden = visibleTags.length === 0 && !tag;
	query(page.root, "[data-memos-toolbar]").hidden =
		filters.hidden && feed.totalPages <= 1;
	for (const item of [{ name: "", count: overview.total }, ...visibleTags]) {
		const link = makeFeedLink(item.name, 1, "");
		link.className = "moment-filter__item";
		link.setAttribute(
			"aria-label",
			`${item.name ? `标签 ${item.name}` : "全部动态"}，${complete ? "" : "已加载 "}${item.count} 条动态`,
		);
		if (item.name === tag) {
			link.classList.add("moment-filter__item--active");
			link.setAttribute("aria-current", "page");
		}
		const label = document.createElement("span");
		label.className = "moment-filter__label";
		if (item.name) {
			const prefix = document.createElement("span");
			prefix.className = "moment-filter__prefix";
			prefix.textContent = "#";
			prefix.setAttribute("aria-hidden", "true");
			label.append(prefix);
		}
		label.append(item.name || "全部");
		const count = document.createElement("span");
		count.className = "moment-filter__count";
		count.setAttribute("aria-hidden", "true");
		count.textContent = `${item.count}${complete ? "" : "+"}`;
		if (!complete) count.title = "已加载数量，尚未读取完整";
		link.append(label, count);
		filters.append(link);
	}
	// Do not show a clamped, unrelated page while a deep link is still loading.
	const requestedPage = Number(params.get("page") || 1);
	const waitingForPage =
		!complete &&
		Number.isFinite(requestedPage) &&
		Math.floor(requestedPage) > feed.totalPages;
	const items = waitingForPage ? [] : feed.items;
	const cards = query(page.root, "[data-memos-cards]");
	const cardsChanged =
		!page.renderedMoments ||
		items.length !== page.renderedMoments.length ||
		items.some((moment, index) => moment !== page.renderedMoments?.[index]);
	if (cardsChanged) {
		cards.replaceChildren(...items.map((moment) => renderCard(page, moment)));
		page.renderedMoments = items;
	}
	cards.setAttribute("aria-busy", String(!complete && items.length === 0));
	query(page.root, "[data-memos-status]").hidden = items.length > 0;
	if (items.length === 0) {
		showStatus(
			page,
			complete
				? tag
					? "这个标签下暂无动态"
					: "暂时还没有动态"
				: "正在查找动态…",
			complete
				? "生活里的片段，想起时就记在这里。"
				: "已加载的记录中还没有这一页，正在继续读取。",
			false,
			complete ? "empty" : "loading",
		);
		cards.setAttribute("aria-busy", String(!complete));
	}
	query(page.root, "[data-memos-clear-filter]").hidden =
		!tag || items.length > 0;
	if (waitingForPage)
		query(page.root, "[data-memos-pagination]").replaceChildren();
	else renderPagination(page, feed.currentPage, feed.totalPages, tag);
	setPageTitle(
		page,
		`${tag ? `动态标签 ${tag}` : "动态"}${feed.currentPage > 1 && !waitingForPage ? ` 第 ${feed.currentPage} 页` : ""}`,
	);
	if (cardsChanged) notifyContent(page.root);
}

function isCurrent(page: ActivePage) {
	return active === page && page.root.isConnected && page.key === locationKey();
}

function updateFeedProgress(page: ActivePage, failed = false) {
	const progress = query(page.root, "[data-memos-progress]");
	progress.hidden = page.feed?.complete === true;
	query(progress, "[data-memos-progress-text]").textContent = failed
		? "后续动态加载失败，已加载的内容仍可阅读。"
		: "正在加载更多动态，当前数量和标签统计仅包含已加载内容。";
	query<HTMLButtonElement>(progress, "[data-memos-continue]").hidden = !failed;
}

async function loadFeed(page: ActivePage, snapshot?: MemosFeedSnapshot) {
	if (page.feedLoading) return;
	page.feedLoading = true;
	const controller = page.controller;
	page.feed = snapshot;
	try {
		if (snapshot) renderFeed(page);
		updateFeedProgress(page);
		for await (const batch of streamMemosMoments(
			page.config,
			{ signal: controller.signal },
			snapshot,
		)) {
			if (!isCurrent(page) || controller.signal.aborted) return;
			page.feed = batch;
			renderFeed(page);
			updateFeedProgress(page);
		}
	} catch {
		if (!isCurrent(page) || controller.signal.aborted) return;
		if (page.feed) {
			updateFeedProgress(page, true);
			if (!page.renderedMoments?.length) {
				showStatus(
					page,
					"当前筛选或页码尚未加载完成",
					"已保留加载进度，请点击下方重试。",
				);
			}
		} else {
			query(page.root, "[data-memos-progress]").hidden = true;
			query(page.root, "[data-memos-latest]").textContent = "暂不可用";
			showStatus(
				page,
				"动态加载失败",
				"暂时无法读取动态，请检查网络后重试。",
				true,
			);
		}
	} finally {
		page.feedLoading = false;
	}
}

async function loadPage(page: ActivePage, snapshot?: MemosFeedSnapshot) {
	page.controller.abort();
	page.controller = new AbortController();
	const controller = page.controller;
	page.feed = undefined;
	page.renderedMoments = undefined;
	deferComments(page.root);
	query(page.root, "[data-memos-cards]").replaceChildren();
	page.root.querySelector("[data-memos-pagination]")?.replaceChildren();
	const filters = page.root.querySelector<HTMLElement>("[data-memos-filters]");
	if (filters) filters.hidden = true;
	const toolbar = page.root.querySelector<HTMLElement>("[data-memos-toolbar]");
	if (toolbar) toolbar.hidden = true;
	showStatus(page, "动态加载中…", "正在读取最新记录。", false, "loading");
	query(page.root, "[data-memos-cards]").setAttribute("aria-busy", "true");
	const total = page.root.querySelector("[data-memos-total]");
	if (total) total.textContent = "—";
	const latest = page.root.querySelector("[data-memos-latest]");
	if (latest) {
		latest.textContent = "加载中…";
		latest.removeAttribute("datetime");
	}
	notifyContent(page.root);
	if (!page.detail) {
		await loadFeed(page, snapshot);
		return;
	}
	try {
		setPageTitle(page, "动态详情");
		const id = new URLSearchParams(window.location.search).get("id") || "";
		const moment = await fetchMemosMoment(id, page.config, {
			signal: controller.signal,
		});
		if (!isCurrent(page) || controller.signal.aborted) return;
		if (!moment) {
			showStatus(
				page,
				"动态不存在或已不可访问",
				"这条记录可能已撤回，或尚未发布到博客。",
			);
			return;
		}
		query(page.root, "[data-memos-cards]").replaceChildren(
			renderCard(page, moment),
		);
		query(page.root, "[data-memos-cards]").setAttribute("aria-busy", "false");
		query(page.root, "[data-memos-status]").hidden = true;
		const waline = query(page.root, "#waline");
		waline.dataset.walinePath = getMemosMomentUrl(moment.id);
		delete waline.dataset.walineDeferred;
		query(page.root, "[data-memos-comments]").hidden = false;
		setPageTitle(
			page,
			moment.title || `动态 ${formatMomentDate(moment.published, "shortDate")}`,
		);
		notifyContent(page.root);
		if (window.location.hash === "#moment-interactions")
			requestAnimationFrame(() => {
				if (isCurrent(page))
					query(page.root, "#moment-interactions").scrollIntoView({
						block: "start",
					});
			});
	} catch {
		if (!isCurrent(page) || controller.signal.aborted) return;
		deferComments(page.root);
		showStatus(
			page,
			"动态加载失败",
			"暂时无法读取动态，请检查网络后重试。",
			true,
		);
		notifyContent(page.root);
	}
}

function handleClick(event: MouseEvent) {
	const page = active;
	const target = event.target;
	if (!page || !(target instanceof Element)) return;
	if (target.closest("[data-memos-continue]") && !page.feedLoading) {
		void loadFeed(page, page.feed);
	}
	if (target.closest("[data-memos-retry]")) {
		void loadPage(page);
	}
	if (
		page.detail &&
		target.closest("[data-memos-comment-link]") &&
		event.button === 0 &&
		!event.ctrlKey &&
		!event.metaKey &&
		!event.shiftKey &&
		!event.altKey
	) {
		requestAnimationFrame(() => {
			if (!isCurrent(page)) return;
			const comments = query(page.root, "[data-memos-comments]");
			const editor = comments.querySelector<HTMLTextAreaElement>("textarea");
			(editor || comments).focus({ preventScroll: true });
		});
	}
	const album = target.closest("[data-memos-album-open]");
	if (album)
		album
			.closest(".moment-gallery")
			?.querySelector<HTMLButtonElement>(".moment-media-trigger")
			?.click();
}

function refreshMomentDates(root: HTMLElement) {
	const now = new Date();
	for (const time of root.querySelectorAll<HTMLTimeElement>(
		"[data-memos-published], [data-memos-updated]",
	)) {
		const text = formatMomentPublicationDate(new Date(time.dateTime), now);
		if (time.textContent !== text) time.textContent = text;
	}
}

function stopPage() {
	if (!active) return;
	if (active.dateRefreshTimer !== undefined)
		window.clearInterval(active.dateRefreshTimer);
	// Reuse data only while switching filters/pages inside the feed.
	feedSnapshot =
		!active.detail && active.feed
			? { config: JSON.stringify(active.config), feed: active.feed }
			: undefined;
	active.controller.abort();
	active.root.removeEventListener("click", handleClick);
	active = undefined;
}

function setupMemos() {
	const root = document.querySelector<HTMLElement>("[data-memos-root]");
	if (!root) {
		stopPage();
		feedSnapshot = undefined;
		return;
	}
	if (active?.root === root && active.key === locationKey()) return;
	stopPage();
	const pageSize = Number(root.dataset.memosPageSize);
	active = {
		root,
		detail: root.dataset.memosMode === "detail",
		key: locationKey(),
		config: {
			serverURL: root.dataset.memosServer || "",
			creator: root.dataset.memosCreator || "",
			publicationTag: root.dataset.memosTag || "",
			pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 8,
		},
		controller: new AbortController(),
		feedLoading: false,
	};
	root.addEventListener("click", handleClick);
	active.dateRefreshTimer = window.setInterval(() => {
		if (active?.root === root && root.isConnected) refreshMomentDates(root);
	}, 1_000);
	const snapshot =
		!active.detail && feedSnapshot?.config === JSON.stringify(active.config)
			? feedSnapshot.feed
			: undefined;
	feedSnapshot = undefined;
	void loadPage(active, snapshot);
}

document.addEventListener("astro:before-swap", stopPage);
document.addEventListener("astro:page-load", setupMemos);
document.addEventListener("swup:enable", setupMemos);
if (document.readyState === "loading")
	document.addEventListener("DOMContentLoaded", setupMemos, { once: true });
else setupMemos();
