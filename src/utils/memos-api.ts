import {
	type MemosConfig,
	type MemosImage,
	type MemosMoment,
	safeMemosURL,
} from "./memos-utils";

type JsonRecord = Record<string, unknown>;
type RequestOptions = { signal?: AbortSignal };

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMemosId(value: string): boolean {
	return /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,34}[a-zA-Z0-9])?$/.test(value);
}

function getMemosFilter(config: MemosConfig): string {
	if (!config.creator || !config.publicationTag) {
		throw new Error("Memos publication settings are missing");
	}
	return `creator == ${JSON.stringify(config.creator)} && visibility == "PUBLIC" && ${JSON.stringify(config.publicationTag)} in tags`;
}

function isPublishedMemo(
	value: unknown,
	config: MemosConfig,
): value is JsonRecord {
	return (
		isRecord(value) &&
		value.creator === config.creator &&
		value.visibility === "PUBLIC" &&
		value.state === "NORMAL" &&
		Array.isArray(value.tags) &&
		Boolean(config.publicationTag) &&
		value.tags.includes(config.publicationTag)
	);
}

function getServerURL(config: MemosConfig): URL {
	const server = new URL(config.serverURL);
	if (server.protocol !== "https:" || server.username || server.password) {
		throw new Error("Memos requires an HTTPS server URL without credentials");
	}
	return server;
}

function normalizeAttachment(value: unknown, base: string): MemosImage | null {
	if (
		!isRecord(value) ||
		typeof value.type !== "string" ||
		!value.type.startsWith("image/")
	)
		return null;
	if (typeof value.name !== "string" || typeof value.filename !== "string")
		return null;
	const id = value.name.replace(/^attachments\//, "");
	if (value.name !== `attachments/${id}` || !isMemosId(id)) return null;
	const external = typeof value.externalLink === "string" && value.externalLink;
	const src = safeMemosURL(
		external || `/file/${value.name}/${encodeURIComponent(value.filename)}`,
		base,
	);
	if (!src) return null;
	const thumbnail = new URL(src);
	if (!external) thumbnail.searchParams.set("thumbnail", "true");
	const metadata = isRecord(value.mediaMetadata) ? value.mediaMetadata : {};
	return {
		src,
		thumbnail: thumbnail.href,
		alt: value.filename,
		width:
			typeof metadata.width === "number" && metadata.width > 0
				? metadata.width
				: undefined,
		height:
			typeof metadata.height === "number" && metadata.height > 0
				? metadata.height
				: undefined,
	};
}

function normalizeMemo(
	value: unknown,
	config: MemosConfig,
): MemosMoment | null {
	if (!isPublishedMemo(value, config)) return null;
	if (typeof value.name !== "string" || !value.name.startsWith("memos/"))
		return null;
	const id = value.name.slice("memos/".length);
	if (!isMemosId(id)) return null;
	const published = new Date(String(value.createTime));
	const updated = new Date(String(value.updateTime));
	if (
		!Number.isFinite(published.getTime()) ||
		!Number.isFinite(updated.getTime())
	) {
		throw new Error("Memos returned an invalid timestamp");
	}
	const property = isRecord(value.property) ? value.property : {};
	const location = isRecord(value.location) ? value.location : {};
	const base = getServerURL(config).href;
	return {
		id,
		title: typeof property.title === "string" ? property.title.trim() : "",
		content: typeof value.content === "string" ? value.content : "",
		published,
		updated,
		tags: [
			...new Set(
				(value.tags as unknown[])
					.filter(
						(tag): tag is string =>
							typeof tag === "string" && Boolean(tag.trim()),
					)
					.map((tag) => tag.trim()),
			),
		],
		pinned: value.pinned === true,
		location:
			typeof location.placeholder === "string" ? location.placeholder : "",
		images: (Array.isArray(value.attachments) ? value.attachments : [])
			.map((attachment) => normalizeAttachment(attachment, base))
			.filter((image): image is MemosImage => image !== null),
	};
}

async function requestJSON(
	url: URL,
	options: RequestOptions,
): Promise<unknown> {
	const controller = new AbortController();
	const abort = () => controller.abort(options.signal?.reason);
	if (options.signal?.aborted) abort();
	else options.signal?.addEventListener("abort", abort, { once: true });
	const timeout = setTimeout(
		() =>
			controller.abort(new DOMException("Request timed out", "TimeoutError")),
		15000,
	);
	try {
		const response = await fetch(url, {
			method: "GET",
			mode: "cors",
			credentials: "omit",
			cache: "no-store",
			headers: { Accept: "application/json" },
			signal: controller.signal,
		});
		if (!response.ok) {
			throw new MemosHTTPError(response.status);
		}
		return await response.json();
	} finally {
		clearTimeout(timeout);
		options.signal?.removeEventListener("abort", abort);
	}
}

class MemosHTTPError extends Error {
	status: number;
	constructor(status: number) {
		super(`Memos request failed: ${status}`);
		this.status = status;
	}
}

export type MemosFeedSnapshot = {
	moments: MemosMoment[];
	nextPageToken: string;
	complete: boolean;
	seenTokens: string[];
};

// Yield each successful batch so later failures never discard readable content.
export async function* streamMemosMoments(
	config: MemosConfig,
	options: RequestOptions = {},
	snapshot?: MemosFeedSnapshot,
): AsyncGenerator<MemosFeedSnapshot> {
	if (snapshot?.complete) return;
	const moments = new Map(
		snapshot?.moments.map((moment) => [moment.id, moment]),
	);
	const seenTokens = new Set(snapshot?.seenTokens);
	let pageToken = snapshot?.nextPageToken || "";
	do {
		options.signal?.throwIfAborted();
		const endpoint = new URL("/api/v1/memos", getServerURL(config));
		endpoint.searchParams.set(
			"pageSize",
			pageToken ? "50" : String(config.pageSize),
		);
		endpoint.searchParams.set("state", "NORMAL");
		endpoint.searchParams.set("orderBy", "pinned desc, create_time desc");
		endpoint.searchParams.set("filter", getMemosFilter(config));
		if (pageToken) endpoint.searchParams.set("pageToken", pageToken);
		const data = await requestJSON(endpoint, options);
		options.signal?.throwIfAborted();
		if (
			!isRecord(data) ||
			!Array.isArray(data.memos) ||
			(data.nextPageToken !== undefined &&
				typeof data.nextPageToken !== "string")
		)
			throw new Error("Memos returned an invalid list");
		const nextPageToken =
			typeof data.nextPageToken === "string" ? data.nextPageToken : "";
		if (
			nextPageToken &&
			(nextPageToken === pageToken || seenTokens.has(nextPageToken))
		)
			throw new Error("Memos repeated a pagination token");
		for (const entry of data.memos) {
			const moment = normalizeMemo(entry, config);
			if (moment) moments.set(moment.id, moment);
		}
		if (pageToken) seenTokens.add(pageToken);
		pageToken = nextPageToken;
		yield {
			moments: [...moments.values()].sort(
				(a, b) =>
					Number(b.pinned) - Number(a.pinned) ||
					b.published.getTime() - a.published.getTime() ||
					a.id.localeCompare(b.id),
			),
			nextPageToken: pageToken,
			complete: !pageToken,
			seenTokens: [...seenTokens],
		};
	} while (pageToken);
}

export async function fetchMemosMoment(
	id: string,
	config: MemosConfig,
	options: RequestOptions = {},
): Promise<MemosMoment | null> {
	if (!isMemosId(id)) return null;
	try {
		const data = await requestJSON(
			new URL(`/api/v1/memos/${encodeURIComponent(id)}`, getServerURL(config)),
			options,
		);
		const moment = normalizeMemo(data, config);
		return moment?.id === id ? moment : null;
	} catch (error) {
		if (
			error instanceof MemosHTTPError &&
			[401, 403, 404].includes(error.status)
		)
			return null;
		throw error;
	}
}
