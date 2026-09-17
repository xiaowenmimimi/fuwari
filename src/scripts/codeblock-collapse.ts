/**
 * 超长代码块折叠：测量代码块渲染高度，超过阈值时注入渐变遮罩和展开/收起按钮。
 * 在代码块 meta 中写 nocollapse 可单独关闭，见 src/plugins/expressive-code/collapse-opt-out.ts
 */
import collapseCss from "../styles/codeblock-collapse.css?inline";

// 折叠后保留可见的行数
const COLLAPSE_LINES = 20;
// 被折叠的行数少于此值时不折叠，避免窄屏下按钮只多展开三四行
const MIN_HIDDEN_LINES = 5;
// 折叠态底部留给按钮的高度，与 codeblock-collapse.css 中的按钮区域保持一致
const BUTTON_STRIP_REM = 2;
// 收起后若代码块顶部已滚出视口，滚回来时预留的导航栏高度
const NAVBAR_OFFSET_REM = 5.5;
// 窗口尺寸变化后重新测量的防抖时间
const RESIZE_DEBOUNCE_MS = 150;

type CollapseWindow = Window & {
	__fuwariCodeCollapseReady?: boolean;
};

const collapseWindow = window as CollapseWindow;

const ARROW_ICON =
	'<svg class="code-collapse-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" aria-hidden="true"><path d="M480-345 240-585l57-57 183 183 183-183 57 57-240 240Z"/></svg>';

let resizeTimer: number | undefined;

function remToPx(rem: number) {
	const rootFontSize = Number.parseFloat(
		getComputedStyle(document.documentElement).fontSize,
	);
	return rem * (rootFontSize || 16);
}

function setCollapsed(frame: HTMLElement, collapsed: boolean) {
	frame.classList.toggle("is-collapsed", collapsed);

	const button = frame.querySelector(".code-collapse-btn");
	button?.setAttribute("aria-expanded", String(!collapsed));

	const label = frame.querySelector(".code-collapse-label");
	if (label) {
		label.textContent = collapsed
			? `展开剩余 ${frame.dataset.codeHiddenLines} 行`
			: "收起";
	}
}

function addToggle(frame: HTMLElement, code: Element) {
	const ui = document.createElement("div");
	ui.className = "code-collapse-ui";
	ui.innerHTML = `<button class="code-collapse-btn" type="button">${ARROW_ICON}<span class="code-collapse-label"></span></button>`;
	frame.append(ui);

	ui.querySelector("button")?.addEventListener("click", () => {
		const collapsing = !frame.classList.contains("is-collapsed");
		setCollapsed(frame, collapsing);
		if (!collapsing) return;

		// 收起后代码块可能整块滚出视口上方，把它拉回来
		const { top } = frame.getBoundingClientRect();
		if (top < 0) window.scrollBy({ top: top - remToPx(NAVBAR_OFFSET_REM) });
	});

	// 手动折叠段（collapse={...}）展开后会撑高内容，此时取消整块折叠避免被裁掉
	if (frame.dataset.codeCollapseSections !== "bound") {
		frame.dataset.codeCollapseSections = "bound";
		for (const details of code.querySelectorAll("details")) {
			details.addEventListener("toggle", () => {
				if (details.open && frame.classList.contains("is-collapsed")) {
					setCollapsed(frame, false);
				}
			});
		}
	}
}

function removeToggle(frame: HTMLElement) {
	frame.classList.remove("code-collapsible", "is-collapsed");
	frame.querySelector(".code-collapse-ui")?.remove();
	frame.style.removeProperty("--code-collapsed-height");
	delete frame.dataset.codeCollapse;
	delete frame.dataset.codeHiddenLines;
}

function evaluateFrame(frame: HTMLElement) {
	if (frame.classList.contains("no-collapse")) return;

	const pre = frame.querySelector("pre");
	const code = pre?.querySelector("code");
	if (!pre || !code) return;

	const codeStyle = getComputedStyle(code);
	const lineHeight = Number.parseFloat(codeStyle.lineHeight) || 24;
	const collapsedHeight = Math.round(
		Number.parseFloat(codeStyle.paddingTop) +
			COLLAPSE_LINES * lineHeight +
			remToPx(BUTTON_STRIP_REM),
	);
	// max-height 不影响 scrollHeight，折叠状态下也能拿到内容完整高度
	const hiddenLines = Math.round(
		(pre.scrollHeight - collapsedHeight) / lineHeight,
	);

	// 窗口宽度变化后自动换行的行数会变，这里允许把已折叠的代码块还原回去
	if (hiddenLines < MIN_HIDDEN_LINES) {
		if (frame.dataset.codeCollapse === "ready") removeToggle(frame);
		return;
	}

	frame.dataset.codeHiddenLines = String(hiddenLines);
	frame.style.setProperty("--code-collapsed-height", `${collapsedHeight}px`);

	if (frame.dataset.codeCollapse === "ready") {
		setCollapsed(frame, frame.classList.contains("is-collapsed"));
		return;
	}

	frame.dataset.codeCollapse = "ready";
	frame.classList.add("code-collapsible");
	addToggle(frame, code);
	setCollapsed(frame, true);
}

function evaluateAll() {
	const frames = document.querySelectorAll<HTMLElement>(
		".expressive-code .frame",
	);
	for (const frame of frames) {
		evaluateFrame(frame);
	}
}

// swup 切换页面后布局还没稳定，等一帧再测量，否则自动换行的行数会偏多
function scheduleEvaluate() {
	ensureCollapseStyles();
	requestAnimationFrame(evaluateAll);
	// 等宽字体加载后行宽会变化，需要再测一次
	document.fonts?.ready.then(evaluateAll);
}

function ensureCollapseStyles() {
	const styleId = "fuwari-code-collapse-style";
	if (document.getElementById(styleId)) return;
	const style = document.createElement("style");
	style.id = styleId;
	style.textContent = collapseCss;
	document.head.append(style);
}

export function setupCodeBlockCollapse() {
	ensureCollapseStyles();
	scheduleEvaluate();

	if (collapseWindow.__fuwariCodeCollapseReady) return;
	collapseWindow.__fuwariCodeCollapseReady = true;

	document.addEventListener("astro:page-load", scheduleEvaluate);
	document.addEventListener("encrypted-post-unlocked", scheduleEvaluate);
	window.addEventListener("resize", () => {
		window.clearTimeout(resizeTimer);
		resizeTimer = window.setTimeout(evaluateAll, RESIZE_DEBOUNCE_MS);
	});
}
