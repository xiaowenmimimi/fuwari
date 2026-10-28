type WalineClient = typeof import("@waline/client/full");
type WalineOptions = Parameters<WalineClient["init"]>[0];
type WalineInstance = NonNullable<ReturnType<WalineClient["init"]>>;
type SwupHooks = {
	on: (
		event: string,
		handler: () => void,
		options?: { before?: boolean; priority?: number },
	) => void;
	off: (event: string, handler: () => void) => void;
};
type Page = {
	root: HTMLElement;
	path: string;
	location: string;
	instance: WalineInstance | null;
	pending: Promise<void> | null;
	observer: MutationObserver | null;
	status: HTMLElement | null;
	loading: HTMLElement | null;
	error: HTMLElement | null;
	retry: HTMLButtonElement | null;
	refresh: HTMLButtonElement | null;
	onRetry: () => void;
};

const normalizePathname = (path: string) =>
	path === "/" ? path : path.replace(/\/$/, "");

/** Owns the client cache, page instance and all navigation/DOM listeners. */
export class WalineController {
	private clientPromise: Promise<WalineClient> | null = null;
	private page: Page | null = null;
	private lazyObserver: IntersectionObserver | null = null;
	private hooks: SwupHooks | null = null;
	private started = false;

	constructor(
		private readonly importClient: () => Promise<WalineClient>,
		private readonly getOptions: (
			root: HTMLElement,
			path: string,
		) => WalineOptions,
	) {}

	start() {
		if (this.started) return;
		this.started = true;
		document.addEventListener("astro:before-swap", this.destroy);
		document.addEventListener("astro:page-load", this.onReady);
		document.addEventListener("swup:enable", this.onReady);
		document.addEventListener("DOMContentLoaded", this.onReady);
		document.addEventListener("moments:content-ready", this.onReady);
		this.bindSwup();
		if (document.readyState !== "loading") this.onReady();
	}

	stop() {
		this.started = false;
		document.removeEventListener("astro:before-swap", this.destroy);
		document.removeEventListener("astro:page-load", this.onReady);
		document.removeEventListener("swup:enable", this.onReady);
		document.removeEventListener("DOMContentLoaded", this.onReady);
		document.removeEventListener("moments:content-ready", this.onReady);
		this.unbindSwup();
		this.destroy();
	}

	private bindSwup() {
		const hooks = (window as Window & { swup?: { hooks: SwupHooks } }).swup
			?.hooks;
		if (!hooks || hooks === this.hooks) return;
		this.unbindSwup();
		this.hooks = hooks;
		// Release Vue's style tags before SwupHeadPlugin removes the old head.
		hooks.on("content:replace", this.destroy, { before: true, priority: -100 });
		hooks.on("page:view", this.onReady);
	}

	private unbindSwup() {
		this.hooks?.off("content:replace", this.destroy);
		this.hooks?.off("page:view", this.onReady);
		this.hooks = null;
	}

	private onReady = () => {
		this.bindSwup();
		const root = document.getElementById("waline");
		const path = this.getPath(root);
		const location = `${window.location.pathname}${window.location.search}`;
		if (root?.dataset.walineDeferred === "true") {
			this.destroy();
			return;
		}
		if (
			root === this.page?.root &&
			path === this.page.path &&
			location === this.page.location
		)
			return;
		this.destroy();
		if (!root) return;

		const section = root.closest("[data-waline-section]");
		const page: Page = {
			root,
			path,
			location,
			instance: null,
			pending: null,
			observer: null,
			status: section?.querySelector("[data-waline-status]") ?? null,
			loading: section?.querySelector("[data-waline-loading]") ?? null,
			error: section?.querySelector("[data-waline-error]") ?? null,
			retry: section?.querySelector("[data-waline-retry]") ?? null,
			refresh: section?.querySelector("[data-waline-refresh]") ?? null,
			onRetry: () => {
				if (this.isCurrent(page)) void this.retry(page);
			},
		};
		this.page = page;
		root.replaceChildren();
		page.retry?.addEventListener("click", page.onRetry);
		page.refresh?.addEventListener("click", page.onRetry);
		this.setStatus(page, "loading");

		if (!("IntersectionObserver" in window)) {
			void this.init(page);
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (!this.isCurrent(page) || !entries.some((e) => e.isIntersecting))
					return;
				observer.disconnect();
				this.lazyObserver = null;
				void this.init(page);
			},
			{ rootMargin: "600px 0px" },
		);
		this.lazyObserver = observer;
		observer.observe(root);
	};

	private getPath(root: HTMLElement | null) {
		return normalizePathname(
			root?.dataset.walinePath || window.location.pathname,
		);
	}

	private isCurrent(page: Page) {
		return (
			this.page === page &&
			page.root.isConnected &&
			page.root.dataset.walineDeferred !== "true" &&
			page.location ===
				`${window.location.pathname}${window.location.search}` &&
			page.path === this.getPath(page.root) &&
			page.root === document.getElementById("waline")
		);
	}

	private loadClient() {
		this.clientPromise ??= Promise.resolve()
			.then(this.importClient)
			.catch((error: unknown) => {
				// A rejected import must not poison subsequent retries.
				this.clientPromise = null;
				throw error;
			});
		return this.clientPromise;
	}

	private setStatus(page: Page, status: "loading" | "ready" | "error") {
		page.root.dataset.walineState = status;
		page.root.setAttribute("aria-busy", String(status === "loading"));
		if (page.status) page.status.hidden = status === "ready";
		if (page.loading) page.loading.hidden = status !== "loading";
		if (page.error) page.error.hidden = status !== "error";
		if (page.retry) page.retry.hidden = status !== "error";
		if (page.refresh) page.refresh.hidden = true;
	}

	private init(page: Page): Promise<void> {
		if (!this.isCurrent(page) || page.instance) return Promise.resolve();
		if (page.pending) return page.pending;
		this.setStatus(page, "loading");
		page.pending = (async () => {
			try {
				const client = await this.loadClient();
				// Each page owns its task; an older import cannot mount on a new root.
				if (!this.isCurrent(page)) return;
				const instance = client.init(this.getOptions(page.root, page.path));
				if (!instance) throw new Error("Waline did not create an instance");
				if (!this.isCurrent(page)) {
					instance.destroy();
					return;
				}
				page.instance = instance;
				this.setStatus(page, "ready");
				const syncEmpty = () => {
					if (!this.isCurrent(page)) return;
					if (page.refresh) {
						page.refresh.hidden = !page.root.querySelector(".wl-empty");
					}
				};
				page.observer = new MutationObserver(syncEmpty);
				page.observer.observe(page.root, { childList: true, subtree: true });
				syncEmpty();
			} catch {
				if (!this.isCurrent(page)) return;
				this.releaseInstance(page);
				this.setStatus(page, "error");
			} finally {
				page.pending = null;
			}
		})();
		return page.pending;
	}

	private retry(page: Page) {
		if (page.pending) return page.pending;
		this.releaseInstance(page);
		return this.init(page);
	}

	private releaseInstance(page: Page) {
		page.observer?.disconnect();
		page.observer = null;
		page.instance?.destroy();
		page.instance = null;
		page.root.replaceChildren();
	}

	private destroy = () => {
		const page = this.page;
		this.page = null;
		this.lazyObserver?.disconnect();
		this.lazyObserver = null;
		if (!page) return;
		page.retry?.removeEventListener("click", page.onRetry);
		page.refresh?.removeEventListener("click", page.onRetry);
		this.releaseInstance(page);
	};
}
