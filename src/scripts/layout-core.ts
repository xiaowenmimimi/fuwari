import "overlayscrollbars/overlayscrollbars.css";
import { OverlayScrollbars } from "overlayscrollbars";
import { BANNER_HEIGHT, BANNER_HEIGHT_EXTEND } from "../constants/constants";
import { getHue, getStoredTheme, setTheme } from "../utils/setting-utils";

type SwupVisit = {
	to: { url: string };
	scroll?: { reset?: boolean };
	history?: { popstate?: boolean };
};

type SwupScrollPlugin = {
	name?: string;
	options?: {
		animateScroll?: {
			betweenPages: boolean;
			samePageWithHash: boolean;
			samePage: boolean;
		};
	};
};

type SwupLike = {
	hooks?: {
		on: (
			event: string,
			handler: (visit: SwupVisit) => void,
			options?: unknown,
		) => void;
	};
	findPlugin?: (name: string) => SwupScrollPlugin | undefined;
	plugins?: SwupScrollPlugin[];
};

type LayoutCoreWindow = Window & {
	swup?: SwupLike;
	umami?: {
		track?: (mapper: (props: unknown) => Record<string, unknown>) => void;
	};
	__fuwariLayoutCoreReady?: boolean;
};

const appWindow = window as LayoutCoreWindow;
const bannerEnabled = !!document.getElementById("banner-wrapper");

let lastTrackedPath: string | null = null;
let pendingTrackPath: string | null = null;
let nextUmamiUrl: string | null = null;
let pendingHomePaginationScroll = false;
let homePaginationClickListenerBound = false;
let swupHooksBound = false;
let backToTopBtn = document.getElementById("back-to-top-btn");
let toc = document.getElementById("toc-wrapper");
let tocInner = document.getElementById("toc-inner-wrapper");

function normalizePath(path: string) {
	return path
		.replace(/^https?:\/\/[^/]+/i, "")
		.split(/[?#]/)[0]
		.replace(/^\/|\/$/g, "")
		.toLowerCase();
}

function joinUrl(...parts: string[]) {
	return parts.join("/").replace(/\/+/g, "/");
}

function withBase(path: string) {
	return joinUrl("", import.meta.env.BASE_URL, path);
}

function pathsEqual(path1: string, path2: string) {
	return normalizePath(path1) === normalizePath(path2);
}

const normalizedHomeBase = normalizePath(withBase("/"));

function isHomeListPagePath(path: string) {
	const normalizedPath = normalizePath(path);
	if (normalizedPath === normalizedHomeBase) return true;
	const relativePath =
		normalizedHomeBase && normalizedPath.startsWith(`${normalizedHomeBase}/`)
			? normalizedPath.slice(normalizedHomeBase.length + 1)
			: normalizedPath;
	return /^\d+$/.test(relativePath);
}

function setClickOutsideToClose(panel: string, ignores: string[]) {
	document.addEventListener("click", (event) => {
		const panelDom = document.getElementById(panel);
		const target = event.target;
		if (!(target instanceof Node)) return;
		for (const ignore of ignores) {
			const ignoredElement = document.getElementById(ignore);
			if (ignoredElement === target || ignoredElement?.contains(target)) {
				return;
			}
		}
		panelDom?.classList.add("float-panel-closed");
	});
}

function loadTheme() {
	setTheme(getStoredTheme());
}

function loadHue() {
	document.documentElement.style.setProperty("--hue", String(getHue()));
}

function initCustomScrollbar() {
	const bodyElement = document.querySelector("body");
	if (!bodyElement) return;

	OverlayScrollbars(
		{
			target: bodyElement,
			cancel: {
				nativeScrollbarsOverlaid: true,
			},
		},
		{
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto py-1",
				autoHide: "move",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		},
	);

	const katexElements = document.querySelectorAll(
		".katex-display",
	) as NodeListOf<HTMLElement>;

	const processKatexElement = (element: HTMLElement) => {
		if (!element.parentNode) return;
		if (element.hasAttribute("data-scrollbar-initialized")) return;

		const container = document.createElement("div");
		container.className = "katex-display-container";
		container.setAttribute("aria-label", "scrollable container for formulas");

		element.parentNode.insertBefore(container, element);
		container.appendChild(element);

		OverlayScrollbars(container, {
			scrollbars: {
				theme: "scrollbar-base scrollbar-auto",
				autoHide: "leave",
				autoHideDelay: 500,
				autoHideSuspend: false,
			},
		});

		element.setAttribute("data-scrollbar-initialized", "true");
	};

	const katexObserver = new IntersectionObserver(
		(entries, observer) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				processKatexElement(entry.target as HTMLElement);
				observer.unobserve(entry.target);
			}
		},
		{
			root: null,
			rootMargin: "100px",
			threshold: 0.1,
		},
	);

	for (const element of katexElements) {
		katexObserver.observe(element);
	}
}

function showBanner() {
	const banner = document.getElementById("banner");
	if (!banner) {
		if (bannerEnabled) console.error("Banner element not found");
		return;
	}
	banner.classList.remove("opacity-0", "scale-105");
}

function printConsoleSignature() {
	console.log(` ⣿⣆⠱⣝⡵⣝⢅⠙⣿⢕⢕⢕⢕⢝⣥⢒⠅⣿⣿⣿⡿⣳⣌⠪⡪⣡⢑
 ⣿⣿⣦⠹⣳⣳⣕⢅⠈⢗⢕⢕⢕⢕⢕⢈⢆⠟⠋⠉⠁⠉⠉⠁⠈⠼⢐
 ⢰⣶⣶⣦⣝⢝⢕⢕⠅⡆⢕⢕⢕⢕⢕⣴⠏⣠⡶⠛⡉⡉⡛⢶⣦⡀⠐
 ⡄⢻⢟⣿⣿⣷⣕⣕⣅⣿⣔⣕⣵⣵⣿⣿⢠⣿⢠⣮⡈⣌⠨⠅⠹⣷⡀
 ⡵⠟⠈⢀⣀⣀⡀⠉⢿⣿⣿⣿⣿⣿⣿⣿⣼⣿⢈⡋⠴⢿⡟⣡⡇⣿⡇
 ⠁⣠⣾⠟⡉⡉⡉⠻⣦⣻⣿⣿⣿⣿⣿⣿⣿⣿⣧⠸⣿⣦⣥⣿⡇⡿⣰
 ⢰⣿⡏⣴⣌⠈⣌⠡⠈⢻⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣬⣉⣉⣁⣄⢖⢕
 ⢻⣿⡇⢙⠁⠴⢿⡟⣡⡆⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⣵
 ⣄⣻⣿⣌⠘⢿⣷⣥⣿⠇⣿⣿⣿⣿⣿⣿⠛⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿
 ⢄⠻⣿⣟⠿⠦⠍⠉⣡⣾⣿⣿⣿⣿⣿⣿⢸⣿⣦⠙⣿⣿⣿⣿⣿⣿⣿
 ⡑⣑⣈⣻⢗⢟⢞⢝⣻⣿⣿⣿⣿⣿⣿⣿⠸⣿⠿⠃⣿⣿⣿⣿⣿⣿⡿
 ⡵⡈⢟⢕⢕⢕⢕⣵⣿⣿⣿⣿⣿⣿⣿⣿⣿⣶⣶⣿⣿⣿⣿⣿⠿⠋⣀
 ⣿⣿⣿⢻⣿⣿⣿⣿⠻⣿⣿⡿⠿⠿⠿⣿⠻⡿⠻⠿⣿⡟⠛⠛⢛⣿⣿
 ⣿⠏⣼⢸⡄⢿⢋⢸⣷⣇⢻⣿⣿⣿⣿⣿⡗⣥⠂⢦⣿⣭⢩⡍⣭⣽⣿
 ⣿⣾⣛⣸⣿⣾⣾⣈⣛⣠⣿⣤⣤⣤⣤⣼⣴⣫⣶⣌⣻⣋⣼⣇⣋⣼⣿`);
}

function initPageChrome() {
	loadTheme();
	loadHue();
	initCustomScrollbar();
	showBanner();
}

function resetScrollPosition() {
	window.scrollTo(0, 0);
	document.documentElement.scrollTop = 0;
	document.body.scrollTop = 0;
}

function scrollToHomePostList() {
	const target =
		document.getElementById("home-post-list-anchor") ??
		document.getElementById("main-grid");
	if (!target) return;

	const navbar = document.getElementById("navbar-wrapper");
	const navbarHeight = navbar?.getBoundingClientRect().height ?? 0;
	const extraGap = 12;
	const targetTop =
		target.getBoundingClientRect().top +
		window.scrollY -
		navbarHeight -
		extraGap;
	const banner = document.getElementById("banner-wrapper");
	const bannerBottom = banner
		? Math.ceil(banner.getBoundingClientRect().bottom + window.scrollY)
		: 0;

	window.scrollTo({
		top: Math.max(0, targetTop, bannerBottom),
		behavior: "auto",
	});

	const refreshHomeNavSpacer = () => {
		window.dispatchEvent(new Event("scroll"));
		window.dispatchEvent(new Event("resize"));
	};
	window.requestAnimationFrame(refreshHomeNavSpacer);
	window.setTimeout(refreshHomeNavSpacer, 120);
	window.setTimeout(refreshHomeNavSpacer, 320);
}

function trackUmamiPageview(tries = 0, urlOverride: string | null = null) {
	const desiredUrl = urlOverride ?? window.location.href;
	const currentPath = (() => {
		try {
			const value = new URL(desiredUrl, window.location.origin);
			return `${value.pathname}${value.search}`;
		} catch {
			return `${window.location.pathname}${window.location.search}`;
		}
	})();
	if (lastTrackedPath === currentPath) return;

	const maxTries = 25;
	const umami = appWindow.umami;
	if (umami?.track) {
		umami.track((props: unknown) => ({
			...(props as Record<string, unknown>),
			url: desiredUrl,
		}));
		lastTrackedPath = currentPath;
		pendingTrackPath = null;
		return;
	}

	if (tries >= maxTries) {
		if (pendingTrackPath === currentPath) pendingTrackPath = null;
		return;
	}

	if (pendingTrackPath === currentPath) return;
	pendingTrackPath = currentPath;
	window.setTimeout(() => trackUmamiPageview(tries + 1, urlOverride), 200);
}

function getPathname(value: string) {
	try {
		return new URL(value, window.location.origin).pathname;
	} catch {
		return value;
	}
}

function getHash(value: string) {
	try {
		return new URL(value, window.location.origin).hash;
	} catch {
		return "";
	}
}

function bindHomePaginationClick() {
	if (homePaginationClickListenerBound) return;
	document.addEventListener(
		"click",
		(event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const link = target.closest("a[data-home-pagination-link]");
			if (!link || link.classList.contains("disabled")) return;
			pendingHomePaginationScroll = true;
		},
		{ capture: true },
	);
	homePaginationClickListenerBound = true;
}

function setSwupScrollOptions(swup: SwupLike) {
	const scrollPlugin =
		swup.findPlugin?.("SwupScrollPlugin") ||
		swup.plugins?.find((plugin) => plugin.name === "SwupScrollPlugin");
	if (!scrollPlugin) return;

	scrollPlugin.options ??= {};
	scrollPlugin.options.animateScroll = {
		betweenPages: false,
		samePageWithHash: false,
		samePage: false,
	};
}

function bindSwupHooks() {
	if (swupHooksBound) return;
	const swup = appWindow.swup;
	if (!swup?.hooks) {
		document.addEventListener("swup:enable", bindSwupHooks, { once: true });
		return;
	}

	swupHooksBound = true;
	window.history.scrollRestoration = "manual";
	bindHomePaginationClick();

	swup.hooks.on("link:click", () => {
		document.documentElement.style.setProperty("--content-delay", "0ms");
	});

	swup.hooks.on("content:replace", (visit: SwupVisit) => {
		const shouldUseHomePaginationScroll =
			pendingHomePaginationScroll &&
			isHomeListPagePath(visit.to.url) &&
			!visit.history?.popstate;
		if (
			visit.scroll?.reset &&
			!visit.history?.popstate &&
			!shouldUseHomePaginationScroll
		) {
			resetScrollPosition();
		}
		initCustomScrollbar();
	});

	swup.hooks.on("visit:start", (visit: SwupVisit) => {
		nextUmamiUrl = visit.to.url;
		const shouldUseHomePaginationScroll =
			pendingHomePaginationScroll &&
			isHomeListPagePath(visit.to.url) &&
			!visit.history?.popstate;
		if (pendingHomePaginationScroll && !isHomeListPagePath(visit.to.url)) {
			pendingHomePaginationScroll = false;
		}
		if (
			visit.scroll?.reset !== false &&
			!visit.history?.popstate &&
			!getHash(visit.to.url) &&
			!shouldUseHomePaginationScroll
		) {
			resetScrollPosition();
		}

		const bodyElement = document.querySelector("body");
		if (!bodyElement) return;

		bodyElement.classList.toggle("is-home", isHomeListPagePath(visit.to.url));

		const toPathname = getPathname(visit.to.url);
		bodyElement.classList.toggle(
			"is-post",
			toPathname.startsWith(getPathname(withBase("/posts/"))),
		);
		bodyElement.classList.toggle(
			"is-bangumi",
			pathsEqual(visit.to.url, withBase("/bangumi")),
		);

		const heightExtend = document.getElementById("page-height-extend");
		heightExtend?.classList.remove("hidden");

		const tocWrapper = document.getElementById("toc-wrapper");
		tocWrapper?.classList.add("toc-not-ready");
	});

	swup.hooks.on("page:view", () => {
		document.getElementById("page-height-extend")?.classList.add("hidden");

		const urlForTracking = nextUmamiUrl;
		nextUmamiUrl = null;
		trackUmamiPageview(0, urlForTracking);

		requestAnimationFrame(() => {
			document.getElementById("toc-wrapper")?.classList.remove("toc-not-ready");
			if (
				pendingHomePaginationScroll &&
				isHomeListPagePath(window.location.pathname)
			) {
				scrollToHomePostList();
				pendingHomePaginationScroll = false;
			}
			scrollFunction();
		});
	});

	setSwupScrollOptions(swup);
}

function scrollFunction() {
	const bannerHeight = window.innerHeight * (BANNER_HEIGHT / 100);

	backToTopBtn = document.getElementById("back-to-top-btn");
	toc = document.getElementById("toc-wrapper");
	tocInner = document.getElementById("toc-inner-wrapper");

	if (backToTopBtn) {
		if (
			document.body.scrollTop > bannerHeight ||
			document.documentElement.scrollTop > bannerHeight
		) {
			backToTopBtn.classList.remove("hide");
		} else {
			backToTopBtn.classList.add("hide");
		}
	}

	if (bannerEnabled && toc && tocInner) {
		const scrollTop =
			document.body.scrollTop || document.documentElement.scrollTop;
		const viewportAdaptiveOffset =
			88 + Math.max(0, (window.innerHeight - 1080) * 0.2);
		const targetTop = Math.max(
			56,
			bannerHeight - scrollTop + viewportAdaptiveOffset,
		);
		tocInner.style.top = `${targetTop}px`;
		toc.classList.remove("toc-hide");
	}
}

function updateBannerExtendHeight() {
	let offset = Math.floor(window.innerHeight * (BANNER_HEIGHT_EXTEND / 100));
	offset -= offset % 4;
	document.documentElement.style.setProperty(
		"--banner-height-extend",
		`${offset}px`,
	);
}

function bindWindowScrollHandlers() {
	window.onscroll = scrollFunction;
	window.onresize = updateBannerExtendHeight;
}

export function setupLayoutCore() {
	if (appWindow.__fuwariLayoutCoreReady) {
		initPageChrome();
		scrollFunction();
		return;
	}
	appWindow.__fuwariLayoutCoreReady = true;

	setClickOutsideToClose("display-setting", [
		"display-setting",
		"display-settings-switch",
	]);
	setClickOutsideToClose("nav-menu-panel", [
		"nav-menu-panel",
		"nav-menu-switch",
	]);
	setClickOutsideToClose("search-panel", [
		"search-panel",
		"search-bar",
		"search-switch",
	]);

	printConsoleSignature();
	initPageChrome();
	trackUmamiPageview();
	bindSwupHooks();
	bindWindowScrollHandlers();
	scrollFunction();
}
