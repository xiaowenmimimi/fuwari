export function isMomentDetailPagePath(
	path: string,
	basePath = import.meta.env.BASE_URL,
): boolean {
	const normalize = (value: string) =>
		value
			.replace(/^https?:\/\/[^/]+/i, "")
			.split(/[?#]/)[0]
			.replace(/^\/+|\/+$/g, "")
			.toLowerCase();
	const base = normalize(basePath);
	const detailPath = base ? `${base}/moments/detail` : "moments/detail";
	return normalize(path) === detailPath;
}
