import { toRandomBannerImageUrl } from "../utils/banner-utils";

type RandomBannerWindow = Window & {
	__fuwariRandomBannerLoaded?: boolean;
	__fuwariSyncHomeFirstPostCover?: (imageUrl?: string) => void;
};

const randomBannerWindow = window as RandomBannerWindow;
const RANDOM_BANNER_TIMEOUT_MS = 2500;
const RANDOM_BANNER_IMAGE_TIMEOUT_MS = 5000;

function preloadImage(src: string) {
	return new Promise<void>((resolve, reject) => {
		const image = new Image();
		const timeout = window.setTimeout(() => {
			image.onload = null;
			image.onerror = null;
			reject(new Error("Random banner image load timed out"));
		}, RANDOM_BANNER_IMAGE_TIMEOUT_MS);

		image.referrerPolicy = "no-referrer";
		image.decoding = "async";
		image.onload = () => {
			window.clearTimeout(timeout);
			resolve();
		};
		image.onerror = () => {
			window.clearTimeout(timeout);
			reject(new Error("Random banner image failed to load"));
		};
		image.src = src;
	});
}

function replaceBannerImage(banner: HTMLElement, imageUrl: string) {
	const image = banner.querySelector("img");
	if (!image) return;

	if (image.currentSrc === imageUrl || image.src === imageUrl) return;

	for (const source of banner.querySelectorAll("source")) {
		source.removeAttribute("srcset");
	}
	image.removeAttribute("srcset");
	image.removeAttribute("sizes");
	image.referrerPolicy = "no-referrer";
	image.decoding = "async";
	image.src = imageUrl;
	randomBannerWindow.__fuwariSyncHomeFirstPostCover?.(imageUrl);
}

async function loadRandomBanner() {
	if (randomBannerWindow.__fuwariRandomBannerLoaded) return;

	const wrapper = document.getElementById("banner-wrapper");
	const banner = document.getElementById("banner");
	if (!wrapper || !banner) return;
	if (wrapper.dataset.randomBannerEnabled !== "true") return;

	const api = wrapper.dataset.randomBannerApi;
	const ossBase = wrapper.dataset.randomBannerOssBase;
	if (!api || !ossBase) return;

	const controller = new AbortController();
	const timeout = window.setTimeout(
		() => controller.abort(),
		RANDOM_BANNER_TIMEOUT_MS,
	);

	try {
		const response = await fetch(api, {
			signal: controller.signal,
			cache: "no-store",
			referrerPolicy: "no-referrer",
		});
		if (!response.ok) return;

		const data = (await response.json()) as unknown;
		const imageUrl = toRandomBannerImageUrl(data, ossBase);
		if (!imageUrl) return;

		await preloadImage(imageUrl);
		replaceBannerImage(banner, imageUrl);
		randomBannerWindow.__fuwariRandomBannerLoaded = true;
	} catch {
		// Keep the fallback banner when the random API or image request fails.
	} finally {
		window.clearTimeout(timeout);
	}
}

export function setupRandomBanner() {
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", loadRandomBanner, {
			once: true,
		});
	} else {
		loadRandomBanner();
	}
}
