type FetchImpl = (
	input: RequestInfo | URL,
	init?: RequestInit,
) => Promise<Response>;

export type WalineImageUploaderOptions = {
	endpoint?: string;
	token?: string;
	maxSizeBytes?: number;
	fetchImpl?: FetchImpl;
};

const DEFAULT_MAX_SIZE_BYTES = 5 * 1024 * 1024;

const messages = {
	endpointMissing:
		"\u56fe\u7247\u4e0a\u4f20\u5730\u5740\u672a\u914d\u7f6e\u3002",
	tokenMissing: "\u56fe\u7247\u4e0a\u4f20 Token \u672a\u914d\u7f6e\u3002",
	invalidType: "\u53ea\u80fd\u4e0a\u4f20\u56fe\u7247\u6587\u4ef6\u3002",
	unsupported:
		"\u5f53\u524d\u6d4f\u89c8\u5668\u4e0d\u652f\u6301\u56fe\u7247\u4e0a\u4f20\u3002",
	networkFailed:
		"\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a\u65e0\u6cd5\u8fde\u63a5\u4e0a\u4f20\u63a5\u53e3\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3001CORS \u6216 Token \u914d\u7f6e\u3002",
	noDirectUrl:
		"\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a\u63a5\u53e3\u672a\u8fd4\u56de direct_url\u3002",
	failed: (status: number) =>
		`\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff08HTTP ${status}\uff09\u3002`,
	tooLarge: (limit: string) =>
		`\u56fe\u7247\u4e0d\u80fd\u8d85\u8fc7 ${limit}\u3002`,
};

const formatFileSize = (bytes: number) => {
	if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)}MB`;
	if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
	return `${bytes}B`;
};

const normalizeRemoteErrorMessage = (message: string) => {
	const tooLargeMatch = message.match(
		/File too large!?\s*(?:File size limit\s+([0-9.]+\s*[KMGT]?B))?/i,
	);
	if (tooLargeMatch) {
		const limit = tooLargeMatch[1]?.replace(/\s+/g, "").toUpperCase();
		return limit
			? messages.tooLarge(limit)
			: "\u56fe\u7247\u592a\u5927\uff0c\u8bf7\u538b\u7f29\u540e\u518d\u4e0a\u4f20\u3002";
	}
	return message;
};

const readErrorMessage = (value: unknown) => {
	if (!value || typeof value !== "object") return "";
	for (const key of ["message", "msg", "error"]) {
		const message = (value as Record<string, unknown>)[key];
		if (typeof message === "string" && message.trim()) {
			return normalizeRemoteErrorMessage(message.trim());
		}
	}
	return "";
};

export const createWalineImageUploader = ({
	endpoint,
	token,
	maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
	fetchImpl = globalThis.fetch?.bind(globalThis),
}: WalineImageUploaderOptions) => {
	return async (image: File) => {
		const uploadEndpoint = endpoint?.trim();
		const uploadToken = token?.trim();

		if (!uploadEndpoint) throw new Error(messages.endpointMissing);
		if (!uploadToken) throw new Error(messages.tokenMissing);
		if (!image.type.startsWith("image/")) throw new Error(messages.invalidType);
		if (maxSizeBytes > 0 && image.size > maxSizeBytes) {
			throw new Error(messages.tooLarge(formatFileSize(maxSizeBytes)));
		}
		if (!fetchImpl) throw new Error(messages.unsupported);

		const formData = new FormData();
		formData.append("file", image);

		let response: Response;
		try {
			response = await fetchImpl(uploadEndpoint, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${uploadToken}`,
				},
				body: formData,
			});
		} catch {
			throw new Error(messages.networkFailed);
		}

		let data: unknown = null;
		try {
			data = await response.json();
		} catch {
			data = null;
		}

		if (!response.ok) {
			const errorMessage = readErrorMessage(data);
			throw new Error(errorMessage || messages.failed(response.status));
		}

		const directUrl =
			data && typeof data === "object"
				? (data as Record<string, unknown>).direct_url
				: null;
		if (typeof directUrl !== "string" || !directUrl.trim()) {
			throw new Error(messages.noDirectUrl);
		}

		return directUrl.trim();
	};
};
