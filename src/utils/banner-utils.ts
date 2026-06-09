import type { BannerImageSource, RandomApiBannerSource } from "../types/config";

type RandomBannerResponse = {
	url?: unknown;
};

type PickedBannerSource =
	| {
			index: number | null;
			src: string;
	  }
	| {
			index: null;
			src: null;
	  };

const randomBannerPathPattern =
	/^\/file\/banner\/[^?#]+\.(?:avif|gif|jpe?g|png|webp)$/i;

function isRandomApiBannerSource(
	source: BannerImageSource,
): source is RandomApiBannerSource {
	return typeof source === "object" && !Array.isArray(source);
}

export function getBannerFallbackSource(source: BannerImageSource) {
	return isRandomApiBannerSource(source) ? source.fallback : source;
}

export function pickBannerSource(
	source: string | readonly string[],
): PickedBannerSource {
	if (typeof source === "string") {
		const src = source.trim();
		return src ? { index: null, src } : { index: null, src: null };
	}

	if (source.length === 0) {
		return { index: null, src: null };
	}

	const index = Math.floor(Math.random() * source.length);
	const src = source[index]?.trim();
	return src ? { index, src } : { index: null, src: null };
}

export function getRandomBannerConfig(source: BannerImageSource) {
	if (!isRandomApiBannerSource(source)) return null;
	if (!source.random) return null;

	return {
		api: source.api,
		ossBase: source.ossBase,
	};
}

export function toRandomBannerImageUrl(
	responseOrPath: RandomBannerResponse | string | unknown,
	ossBase: string,
): string | null {
	let baseUrl: URL;
	try {
		baseUrl = new URL(ossBase);
	} catch {
		return null;
	}
	if (baseUrl.protocol !== "https:" || baseUrl.search || baseUrl.hash) {
		return null;
	}

	const path =
		typeof responseOrPath === "string"
			? responseOrPath
			: responseOrPath &&
					typeof responseOrPath === "object" &&
					"url" in responseOrPath
				? responseOrPath.url
				: undefined;
	if (typeof path !== "string" || !randomBannerPathPattern.test(path)) {
		return null;
	}

	const normalizedBase = baseUrl.toString().replace(/\/+$/, "");
	const normalizedPath = path.replace(/^\/file/, "");

	return `${normalizedBase}${normalizedPath}`;
}
