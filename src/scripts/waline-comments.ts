import { createWalineImageUploader } from "@utils/waline-image-uploader";

type WalineClient = typeof import("@waline/client/full");
type WalineInitOptions = Parameters<WalineClient["init"]>[0];
type WalineEnhanceState = {
	toast: { lastAt: number; lastText: string; lastSubmitAt: number };
	patch: {
		alertPatched: boolean;
		observer: MutationObserver | null;
		requiredMetaGuardRoot: HTMLElement | null;
	};
	waline: {
		client: WalineClient | null;
		clientPromise: Promise<WalineClient> | null;
		initPromise: Promise<void> | null;
		initedPath: string;
	};
	lazy: {
		observer: IntersectionObserver | null;
		observedEl: HTMLElement | null;
	};
};
type SwupLike = {
	hooks?: {
		on: (event: string, handler: () => void) => void;
	};
};

declare global {
	interface Window {
		__walineEnhance?: WalineEnhanceState;
	}
}

const TOO_FAST_RE = /comment too fast!?/i;
const TOO_FAST_TEXT = "评论太频繁，请 1 分钟后再试。";
const REQUIRED_META_RE =
	/(NickName.*(cannot|required)|E-?Mail.*(error|required)|Please.*email|昵称.*(必填|不能为空)|邮箱.*(必填|不能为空))/i;
const REQUIRED_META_TEXT = "昵称和邮箱为必填项，请填写后再提交。";
const INVALID_EMAIL_TEXT = "邮箱格式不正确，请检查后再提交。";
const UPLOAD_FETCH_ERROR_RE =
	/(Failed to fetch|fetch failed|NetworkError|Load failed)/i;
const UPLOAD_ERROR_RE =
	/(\u56fe\u7247\u4e0a\u4f20|\u56fe\u7247\u4e0d\u80fd|\u56fe\u7247\u592a\u5927|File too large)/i;
const UPLOAD_NETWORK_TEXT =
	"\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff1a\u65e0\u6cd5\u8fde\u63a5\u4e0a\u4f20\u63a5\u53e3\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3001CORS \u6216 Token \u914d\u7f6e\u3002";
const UPLOAD_TOO_LARGE_TEXT =
	"\u56fe\u7247\u592a\u5927\uff0c\u8bf7\u538b\u7f29\u540e\u518d\u4e0a\u4f20\u3002";
const WALINE_ROOT_MARGIN = "600px 0px";

const normalizePathname = (pathname?: string) => {
	if (!pathname) return "/";
	if (pathname !== "/" && pathname.endsWith("/")) {
		return pathname.slice(0, -1);
	}
	return pathname;
};

const getEnhanceState = (): WalineEnhanceState => {
	window.__walineEnhance ??= {
		toast: { lastAt: 0, lastText: "", lastSubmitAt: 0 },
		patch: { alertPatched: false, observer: null, requiredMetaGuardRoot: null },
		waline: {
			client: null,
			clientPromise: null,
			initPromise: null,
			initedPath: "",
		},
		lazy: { observer: null, observedEl: null },
	};
	return window.__walineEnhance;
};

const loadWaline = async (): Promise<WalineClient> => {
	const state = getEnhanceState();
	if (state.waline.client) return state.waline.client;
	if (!state.waline.clientPromise) {
		state.waline.clientPromise = import("@waline/client/full");
	}
	const module = await state.waline.clientPromise;
	state.waline.client = module;
	return module;
};

const isWalineLoginStatus = (
	value: string,
): value is NonNullable<WalineInitOptions["login"]> => {
	return value === "enable" || value === "disable" || value === "force";
};

const getImageUploadMaxSizeBytes = (value?: string) => {
	const maxSizeMB = Number(value);
	if (!Number.isFinite(maxSizeMB) || maxSizeMB <= 0) return undefined;
	return Math.round(maxSizeMB * 1024 * 1024);
};

const getWalineOptions = (
	el: HTMLElement,
	pageKey: string,
): WalineInitOptions => {
	const {
		serverUrl,
		lang,
		login,
		dark,
		pageview,
		imageUploadEndpoint,
		imageUploadToken,
		imageUploadMaxSizeMb,
	} = el.dataset;
	const options: WalineInitOptions = {
		el: "#waline",
		serverURL: serverUrl || "",
		path: pageKey,
		dark: dark || "html.dark",
		requiredMeta: ["nick", "mail"],
	};
	if (typeof lang !== "undefined") options.lang = lang;
	if (typeof login !== "undefined" && isWalineLoginStatus(login))
		options.login = login;
	if (typeof pageview !== "undefined") options.pageview = pageview === "true";
	if (imageUploadEndpoint) {
		options.imageUploader = imageUploadToken
			? createWalineImageUploader({
					endpoint: imageUploadEndpoint,
					token: imageUploadToken,
					maxSizeBytes: getImageUploadMaxSizeBytes(imageUploadMaxSizeMb),
				})
			: false;
	}
	return options;
};

const ensureToastRoot = () => {
	let root = document.getElementById("wln-toast-root");
	if (!root) {
		root = document.createElement("div");
		root.id = "wln-toast-root";
		document.body.appendChild(root);
	}
	return root;
};

const showToast = (message: unknown) => {
	const state = getEnhanceState();
	const now = Date.now();
	const text = String(message || "");
	if (text && text === state.toast.lastText && now - state.toast.lastAt < 700)
		return;
	state.toast.lastAt = now;
	state.toast.lastText = text;

	const root = ensureToastRoot();
	const toast = document.createElement("div");
	toast.className = "wln-toast";
	toast.textContent = text;
	root.appendChild(toast);

	requestAnimationFrame(() => {
		toast.classList.add("show");
	});

	const remove = () => {
		if (!toast.isConnected) return;
		toast.classList.remove("show");
		window.setTimeout(() => toast.remove(), 180);
	};

	window.setTimeout(remove, 2600);
	toast.addEventListener("click", remove, { once: true });
};

const canNotifyTooFast = () => {
	const state = getEnhanceState();
	const lastSubmitAt = Number(state.toast.lastSubmitAt || 0);
	if (!lastSubmitAt) return false;
	return Date.now() - lastSubmitAt < 5000;
};

const getUploadErrorText = (text: string) => {
	const value = text.trim();
	if (!value) return "";
	if (UPLOAD_FETCH_ERROR_RE.test(value)) return UPLOAD_NETWORK_TEXT;
	if (/File too large/i.test(value)) return UPLOAD_TOO_LARGE_TEXT;
	if (UPLOAD_ERROR_RE.test(value)) return value;
	return "";
};

const patchAlertOnce = () => {
	const state = getEnhanceState();
	if (state.patch.alertPatched) return;
	state.patch.alertPatched = true;

	const originalAlert =
		typeof window.alert === "function" ? window.alert.bind(window) : null;

	window.alert = (message) => {
		const text = String(message ?? "");
		const uploadErrorText = getUploadErrorText(text);
		if (uploadErrorText) {
			showToast(uploadErrorText);
			return;
		}
		if (TOO_FAST_RE.test(text)) {
			if (canNotifyTooFast()) showToast(TOO_FAST_TEXT);
			return;
		}
		if (REQUIRED_META_RE.test(text)) {
			showToast(REQUIRED_META_TEXT);
			return;
		}
		return originalAlert?.(message);
	};
};

const replaceAlertTextInElement = (element: Element, originalText?: string) => {
	if (!element) return false;
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
	let replaced = false;
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		const value = node.nodeValue ?? "";
		const uploadErrorText = getUploadErrorText(value);
		if (uploadErrorText) {
			node.nodeValue = uploadErrorText;
			replaced = true;
		}
		if (TOO_FAST_RE.test(value) && canNotifyTooFast()) {
			node.nodeValue = value.replace(TOO_FAST_RE, TOO_FAST_TEXT);
			replaced = true;
		}
		if (REQUIRED_META_RE.test(value)) {
			node.nodeValue = REQUIRED_META_TEXT;
			replaced = true;
		}
	}
	if (replaced && originalText) {
		const uploadErrorText = getUploadErrorText(originalText);
		if (uploadErrorText) showToast(uploadErrorText);
		else if (TOO_FAST_RE.test(originalText) && canNotifyTooFast())
			showToast(TOO_FAST_TEXT);
		else if (REQUIRED_META_RE.test(originalText)) showToast(REQUIRED_META_TEXT);
	}
	return replaced;
};

const setupAlertObserverOnce = () => {
	const state = getEnhanceState();
	if (state.patch.observer) return;

	const observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			for (const addedNode of mutation.addedNodes) {
				if (!(addedNode instanceof HTMLElement)) continue;
				const text = addedNode.textContent || "";
				const shouldReplace =
					getUploadErrorText(text) ||
					REQUIRED_META_RE.test(text) ||
					(TOO_FAST_RE.test(text) && canNotifyTooFast());
				if (!shouldReplace) continue;
				replaceAlertTextInElement(addedNode, text);
			}
		}
		syncWalineEmptyState();
	});

	observer.observe(document.body, { childList: true, subtree: true });
	state.patch.observer = observer;
};

const setupRequiredMetaGuard = () => {
	const state = getEnhanceState();
	const root = document.querySelector("#waline");
	if (!(root instanceof HTMLElement)) return;
	if (state.patch.requiredMetaGuardRoot === root) return;
	state.patch.requiredMetaGuardRoot = root;

	const findMetaInput = (keys: string[]) => {
		const header = document.querySelector("#waline .wl-header");
		if (!header) return null;
		const items = header.querySelectorAll(".wl-header-item");
		for (const item of items) {
			const label = item.querySelector("label");
			const input = item.querySelector("input");
			if (!(input instanceof HTMLInputElement)) continue;
			const labelText = (label?.textContent || "").trim().toLowerCase();
			if (keys.some((k) => labelText.includes(k))) return input;
			const nameAttr = (input.getAttribute("name") || "").toLowerCase();
			if (keys.some((k) => nameAttr.includes(k))) return input;
			const placeholder = (
				input.getAttribute("placeholder") || ""
			).toLowerCase();
			if (keys.some((k) => placeholder.includes(k))) return input;
		}
		return null;
	};

	const isValidEmail = (value: unknown) => {
		const v = String(value || "").trim();
		if (!v) return false;
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
	};

	const onClickCapture = (event: Event) => {
		const target = event.target;
		if (!(target instanceof Element)) return;
		if ("isTrusted" in event && !event.isTrusted) return;
		const submitBtn = target.closest(".wl-info .wl-btn.primary");
		if (!submitBtn) return;
		getEnhanceState().toast.lastSubmitAt = Date.now();

		const nickInput = findMetaInput(["nick", "nickname", "昵称"]);
		const mailInput = findMetaInput(["mail", "email", "e-mail", "邮箱"]);
		const nick = nickInput?.value?.trim() || "";
		const mail = mailInput?.value?.trim() || "";

		if (!nick || !mail) {
			showToast(REQUIRED_META_TEXT);
			if (!nick) nickInput?.focus?.();
			else mailInput?.focus?.();
			event.preventDefault?.();
			event.stopPropagation?.();
			event.stopImmediatePropagation?.();
			return;
		}

		if (!isValidEmail(mail)) {
			showToast(INVALID_EMAIL_TEXT);
			mailInput?.focus?.();
			event.preventDefault?.();
			event.stopPropagation?.();
			event.stopImmediatePropagation?.();
		}
	};

	root.addEventListener("click", onClickCapture, true);
};

const refreshWalineComments = async (button?: HTMLButtonElement) => {
	const state = getEnhanceState();
	const el = document.querySelector("#waline");
	if (!(el instanceof HTMLElement)) return;
	if (state.waline.initPromise) return state.waline.initPromise;

	if (button) {
		button.disabled = true;
		button.textContent = "刷新中";
	}

	delete el.dataset.walineInited;
	state.waline.initedPath = "";

	try {
		await initWaline();
	} finally {
		if (button?.isConnected) {
			button.disabled = false;
			button.textContent = "刷新";
		}
	}
};

const syncWalineEmptyState = () => {
	const cards = document.querySelector("#waline [data-waline] .wl-cards");
	if (!(cards instanceof HTMLElement)) return;

	const existing = cards.querySelector(".waline-empty-state");
	const hasRealComments = Array.from(cards.children).some((child) => {
		if (!(child instanceof HTMLElement)) return false;
		return !child.classList.contains("waline-empty-state");
	});

	if (hasRealComments) {
		existing?.remove();
		return;
	}
	if (existing) return;

	const emptyState = document.createElement("div");
	emptyState.className = "waline-empty-state";
	emptyState.setAttribute("role", "status");

	const text = document.createElement("span");
	text.className = "waline-empty-state__text";
	text.textContent = "还没有评论，写下第一句吧。";

	const refreshButton = document.createElement("button");
	refreshButton.type = "button";
	refreshButton.className = "waline-empty-state__refresh";
	refreshButton.textContent = "刷新";
	refreshButton.addEventListener("click", () => {
		refreshWalineComments(refreshButton);
	});

	emptyState.append(text, refreshButton);
	cards.appendChild(emptyState);
};

const initWaline = async () => {
	const state = getEnhanceState();
	if (state.waline.initPromise) return state.waline.initPromise;

	const pageKey = normalizePathname(window.location.pathname);
	const el = document.querySelector("#waline");
	if (!(el instanceof HTMLElement)) return;
	if (state.waline.initedPath === pageKey && el.dataset.walineInited === "true")
		return;

	state.waline.initPromise = (async () => {
		const waline = await loadWaline();

		patchAlertOnce();
		setupAlertObserverOnce();
		setupRequiredMetaGuard();

		el.innerHTML = "";
		const options = getWalineOptions(el, pageKey);
		waline?.init?.(options);
		requestAnimationFrame(() => syncWalineEmptyState());
		window.setTimeout(syncWalineEmptyState, 500);
		el.dataset.walineInited = "true";
		state.waline.initedPath = pageKey;
	})().finally(() => {
		state.waline.initPromise = null;
	});

	return state.waline.initPromise;
};

const observeWaline = () => {
	const state = getEnhanceState();
	const el = document.querySelector("#waline");
	if (!(el instanceof HTMLElement)) return;
	if (el.dataset.walineInited === "true") return;
	if (state.lazy.observer && state.lazy.observedEl === el) return;

	if (state.lazy.observer) {
		state.lazy.observer.disconnect();
		state.lazy.observer = null;
	}
	state.lazy.observedEl = el;

	if (!("IntersectionObserver" in window)) {
		initWaline();
		return;
	}

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				observer.disconnect();
				if (state.lazy.observer === observer) state.lazy.observer = null;
				initWaline();
				break;
			}
		},
		{ rootMargin: WALINE_ROOT_MARGIN },
	);
	state.lazy.observer = observer;
	observer.observe(el);
};

const onReady = () => {
	observeWaline();
};

document.addEventListener("astro:page-load", onReady);
if (
	document.readyState === "complete" ||
	document.readyState === "interactive"
) {
	onReady();
} else {
	document.addEventListener("DOMContentLoaded", onReady);
}
const swup = (window as Window & { swup?: SwupLike }).swup;
if (swup?.hooks) {
	swup.hooks.on("page:view", onReady);
}
