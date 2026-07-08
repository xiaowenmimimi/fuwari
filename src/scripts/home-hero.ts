type HomeHeroWindow = Window & {
	__fuwariHomeHeroReady?: boolean;
	__fuwariSyncHomeFirstPostCover?: (imageUrl?: string) => void;
};

const homeHeroWindow = window as HomeHeroWindow;
const homeNavSpacer = {
	ticking: false,
};

function normalizePath(path: string) {
	return path
		.replace(/^https?:\/\/[^/]+/i, "")
		.split(/[?#]/)[0]
		.replace(/^\/|\/$/g, "")
		.toLowerCase();
}

function isHomePageActive() {
	const normalizedBase = normalizePath(import.meta.env.BASE_URL || "/");
	const normalizedPath = normalizePath(window.location.pathname);
	return (
		document.body.classList.contains("is-home") ||
		normalizedPath === normalizedBase
	);
}

function getCurrentBannerImageUrl() {
	const bannerImage = document.querySelector("#banner img");
	if (!(bannerImage instanceof HTMLImageElement)) return "";

	return bannerImage.currentSrc || bannerImage.src || "";
}

function syncHomeFirstPostCover(nextImageUrl?: string) {
	if (!isHomePageActive()) return;

	const cover = document.querySelector('[data-home-first-post-cover="true"]');
	if (!(cover instanceof HTMLElement)) return;

	const coverImage = cover.querySelector("[data-home-first-post-cover-image]");
	if (!(coverImage instanceof HTMLImageElement)) return;

	const imageUrl =
		typeof nextImageUrl === "string" && nextImageUrl
			? nextImageUrl
			: getCurrentBannerImageUrl();
	if (!imageUrl) return;

	if (coverImage.src !== imageUrl && coverImage.currentSrc !== imageUrl) {
		coverImage.removeAttribute("srcset");
		coverImage.removeAttribute("sizes");
		coverImage.referrerPolicy = "no-referrer";
		coverImage.decoding = "async";
		coverImage.src = imageUrl;
	}

	cover.classList.add("home-first-post-cover-ready");
}

function updateHomeNavSpacer() {
	homeNavSpacer.ticking = false;

	const root = document.documentElement;
	const topRow = document.getElementById("top-row");
	if (!topRow) return;

	if (!isHomePageActive()) {
		root.style.removeProperty("--home-main-grid-spacer-height");
		topRow.classList.remove("home-nav-spacer-active");
		return;
	}

	const navbar = document.getElementById("navbar-wrapper");
	const banner = document.getElementById("banner-wrapper");
	const target =
		document.getElementById("home-post-list-anchor") ??
		document.getElementById("main-grid");
	if (!navbar || !banner || !target) {
		root.style.setProperty("--home-main-grid-spacer-height", "0px");
		topRow.classList.remove("home-nav-spacer-active");
		return;
	}

	const navbarHeight = Math.ceil(navbar.getBoundingClientRect().height);
	const gap = 16;
	const currentSpacer =
		Number.parseFloat(
			root.style.getPropertyValue("--home-main-grid-spacer-height"),
		) || 0;
	const targetTopWithoutSpacer =
		target.getBoundingClientRect().top + window.scrollY - currentSpacer;
	const spacerStartScrollY = targetTopWithoutSpacer - navbarHeight - gap;
	const maxSpacerHeight = navbarHeight + gap;
	const nextSpacer = Math.min(
		maxSpacerHeight,
		Math.max(0, window.scrollY - spacerStartScrollY),
	);
	const shouldShowSpacer = nextSpacer > 0;

	root.style.setProperty("--home-main-grid-spacer-height", `${nextSpacer}px`);
	topRow.classList.toggle("home-nav-spacer-active", shouldShowSpacer);
}

function requestHomeNavSpacerUpdate() {
	if (homeNavSpacer.ticking) return;
	homeNavSpacer.ticking = true;
	window.requestAnimationFrame(updateHomeNavSpacer);
}

function scrollHomeMainGridIntoView() {
	const target =
		document.getElementById("home-post-list-anchor") ??
		document.getElementById("main-grid");
	if (!target) return;

	updateHomeNavSpacer();
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
		behavior: "smooth",
	});
}

function bindHomeScrollButton() {
	const scrollButton = document.getElementById("home-scroll-button");
	if (!scrollButton) return;
	scrollButton.onclick = scrollHomeMainGridIntoView;
}

function bindHomeNavSpacer() {
	requestHomeNavSpacerUpdate();
	window.removeEventListener("scroll", requestHomeNavSpacerUpdate);
	window.removeEventListener("resize", requestHomeNavSpacerUpdate);
	window.addEventListener("scroll", requestHomeNavSpacerUpdate, {
		passive: true,
	});
	window.addEventListener("resize", requestHomeNavSpacerUpdate);
}

function getSubtitle() {
	const subtitleElement = document.getElementById("subtitle-typewriter");
	return subtitleElement instanceof HTMLElement
		? subtitleElement.dataset.subtitle || ""
		: "";
}

function typeWriter(text: string, index: number, callback?: () => void) {
	if (!isHomePageActive()) return;
	const subtitleElement = document.getElementById("subtitle-typewriter");
	if (!subtitleElement) return;
	if (index < text.length) {
		subtitleElement.innerHTML = `${text.substring(0, index + 1)}<span aria-hidden="true"></span>`;
		setTimeout(() => {
			typeWriter(text, index + 1, callback);
		}, 100);
	} else if (typeof callback === "function") {
		setTimeout(callback, 700);
	}
}

function startTypewriter() {
	if (!isHomePageActive()) return;
	const subtitleElement = document.getElementById("subtitle-typewriter");
	if (!subtitleElement) return;

	const subtitle = getSubtitle();
	subtitleElement.classList.remove("typing-done");
	subtitleElement.innerHTML = "";
	setTimeout(() => {
		typeWriter(subtitle, 0, () => {
			subtitleElement.classList.add("typing-done");
		});
	}, 500);
}

function startPostWaveDivider() {
	const root = document.documentElement;
	root.classList.remove("post-wave-divider-ready");
	if (!document.body.classList.contains("is-post")) return;
	setTimeout(() => {
		if (document.body.classList.contains("is-post")) {
			root.classList.add("post-wave-divider-ready");
		}
	}, 120);
}

function bindReadyEvents() {
	document.addEventListener("astro:page-load", startTypewriter);
	document.addEventListener("astro:page-load", startPostWaveDivider);
	document.addEventListener("astro:page-load", bindHomeScrollButton);
	document.addEventListener("astro:page-load", bindHomeNavSpacer);
	document.addEventListener("astro:page-load", () => syncHomeFirstPostCover());
	document.addEventListener("astro:after-swap", bindHomeNavSpacer);
	document.addEventListener("astro:after-swap", () => syncHomeFirstPostCover());
}

function runInitializers() {
	startTypewriter();
	startPostWaveDivider();
	bindHomeScrollButton();
	bindHomeNavSpacer();
	syncHomeFirstPostCover();
}

export function setupHomeHero() {
	homeHeroWindow.__fuwariSyncHomeFirstPostCover = syncHomeFirstPostCover;

	if (homeHeroWindow.__fuwariHomeHeroReady) {
		runInitializers();
		return;
	}
	homeHeroWindow.__fuwariHomeHeroReady = true;
	bindReadyEvents();

	if (document.readyState === "complete") {
		runInitializers();
	} else {
		document.addEventListener("DOMContentLoaded", runInitializers);
	}
}
