type MomentWindow = Window & {
	__fuwariMomentToolsBound?: boolean;
	__fuwariMomentCountAbort?: (reason?: unknown) => void;
	__fuwariMomentCountTimer?: number;
	__fuwariMomentCountGeneration?: number;
};

const momentWindow = window as MomentWindow;

const setShareLabel = (button: HTMLButtonElement, text: string) => {
	const label = button.querySelector(".moment-share-label");
	if (!(label instanceof HTMLElement)) return;
	label.textContent = text;
	window.setTimeout(() => {
		if (label.isConnected) label.textContent = "分享";
	}, 1600);
};

const handleShare = async (event: MouseEvent) => {
	const target = event.target;
	if (!(target instanceof Element)) return;
	const button = target.closest<HTMLButtonElement>("[data-moment-share]");
	if (!button) return;

	const shareUrl = button.dataset.shareUrl;
	const shareTitle = button.dataset.shareTitle || document.title;
	if (!shareUrl) return;

	try {
		if (typeof navigator.share === "function") {
			await navigator.share({ title: shareTitle, url: shareUrl });
			setShareLabel(button, "已分享");
			return;
		}
		await navigator.clipboard.writeText(shareUrl);
		setShareLabel(button, "已复制");
	} catch (error) {
		if (error instanceof DOMException && error.name === "AbortError") return;
		setShareLabel(button, "复制失败");
	}
};

const stopMomentCounts = () => {
	momentWindow.__fuwariMomentCountAbort?.();
	momentWindow.__fuwariMomentCountAbort = undefined;
	if (momentWindow.__fuwariMomentCountTimer)
		window.clearTimeout(momentWindow.__fuwariMomentCountTimer);
	momentWindow.__fuwariMomentCountTimer = undefined;
	momentWindow.__fuwariMomentCountGeneration =
		(momentWindow.__fuwariMomentCountGeneration ?? 0) + 1;
};

const refreshMomentCounts = async () => {
	stopMomentCounts();
	const generation = momentWindow.__fuwariMomentCountGeneration;
	const root = document.querySelector<HTMLElement>("[data-moment-counts]");
	if (!root) return;

	const serverURL = root.dataset.serverUrl;
	if (!serverURL) return;

	const markers = Array.from(
		root.querySelectorAll<HTMLElement>(".moment-comment-count"),
	);
	for (const marker of markers) {
		marker.textContent = "…";
		marker.removeAttribute("title");
	}
	if (markers.length === 0) return;

	try {
		const { commentCount } = await import("@waline/client/comment");
		if (
			!root.isConnected ||
			generation !== momentWindow.__fuwariMomentCountGeneration
		)
			return;
		momentWindow.__fuwariMomentCountAbort = commentCount({
			serverURL,
			selector: ".moment-comment-count",
			lang: root.dataset.lang,
		});

		momentWindow.__fuwariMomentCountTimer = window.setTimeout(() => {
			stopMomentCounts();
			for (const marker of markers) {
				if (marker.textContent?.trim() !== "…") continue;
				marker.textContent = "";
				marker.title = "评论数暂时无法加载";
			}
		}, 8000);
	} catch {
		for (const marker of markers) {
			marker.textContent = "";
			marker.title = "评论数暂时无法加载";
		}
	}
};

const onReady = () => {
	if (!momentWindow.__fuwariMomentToolsBound) {
		document.addEventListener("click", handleShare);
		momentWindow.__fuwariMomentToolsBound = true;
	}
	refreshMomentCounts();
};

document.addEventListener("astro:page-load", onReady);
document.addEventListener("moments:content-ready", onReady);
document.addEventListener("astro:before-swap", stopMomentCounts);
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", onReady, { once: true });
} else {
	onReady();
}
