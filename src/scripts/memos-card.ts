import { renderMemosContent } from "../utils/memos-content";
import type { MemosConfig, MemosMoment } from "../utils/memos-utils";
import {
	formatMomentDate,
	formatMomentPublicationDate,
} from "../utils/moment-date-utils";
import { getMemosFeedUrl, getMemosMomentUrl } from "../utils/url-utils";
import { cloneTemplate, query } from "./memos-dom";

function bindCardNavigation(card: HTMLElement, link: HTMLAnchorElement) {
	const interactive =
		'a, button, input, select, textarea, label, summary, audio, video, img, [role="button"], [role="link"], [tabindex], [contenteditable]:not([contenteditable="false"])';
	const isInteractive = (target: Element) => {
		const control = target.closest(interactive);
		// Page navigation may make ancestors focusable; only skip controls inside this card.
		return control !== null && control !== card && card.contains(control);
	};
	let gesture: {
		id: number;
		x: number;
		y: number;
		startedAt: number;
		blocked: boolean;
	} | null = null;
	const hasSelection = () => Boolean(window.getSelection()?.toString());

	card.addEventListener("pointerdown", (event) => {
		gesture = {
			id: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			startedAt: event.timeStamp,
			blocked:
				!event.isPrimary ||
				event.button !== 0 ||
				hasSelection() ||
				(event.target instanceof Element && isInteractive(event.target)),
		};
	});
	const trackMovement = (event: PointerEvent) => {
		if (!gesture || gesture.id !== event.pointerId) return;
		if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 8)
			gesture.blocked = true;
		if (
			event.pointerType === "touch" &&
			event.timeStamp - gesture.startedAt > 500
		)
			gesture.blocked = true;
	};
	card.addEventListener("pointermove", trackMovement);
	card.addEventListener("pointerup", trackMovement);
	card.addEventListener("pointercancel", () => {
		if (gesture) gesture.blocked = true;
	});
	card.addEventListener("dragstart", () => {
		if (gesture) gesture.blocked = true;
	});
	card.addEventListener("click", (event) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.ctrlKey ||
			event.metaKey ||
			event.shiftKey ||
			event.altKey ||
			gesture?.blocked ||
			hasSelection() ||
			!(event.target instanceof Element) ||
			isInteractive(event.target)
		)
			return;
		// Use the existing link so Swup handles navigation just like a title click.
		link.click();
	});
}

function createTag(tag: string): HTMLAnchorElement {
	const link = document.createElement("a");
	link.className = "moment-tag";
	link.href = getMemosFeedUrl(tag);
	const surface = document.createElement("span");
	surface.className = "moment-tag__surface";
	const prefix = document.createElement("span");
	prefix.className = "moment-tag__prefix";
	prefix.textContent = "#";
	const label = document.createElement("span");
	label.className = "moment-tag__label";
	label.textContent = tag;
	surface.append(prefix, label);
	link.append(surface);
	return link;
}

export function renderCard(
	page: { root: HTMLElement; detail: boolean; config: MemosConfig },
	moment: MemosMoment,
): HTMLElement {
	const card = cloneTemplate<HTMLElement>(
		page.root,
		"[data-memos-card-template]",
	);
	const detailURL = getMemosMomentUrl(moment.id);
	const dateText = formatMomentDate(moment.published, "dateTime");
	const accessibleTitle = moment.title || `${dateText}发布的动态`;
	card.setAttribute("aria-label", accessibleTitle);
	const title = query(card, "[data-memos-title]");
	if (page.detail) {
		title.textContent = moment.title || "动态手记";
	} else {
		const link = query<HTMLAnchorElement>(title, "a");
		link.href = detailURL;
		link.textContent = moment.title;
		title.hidden = !moment.title;
		const detailLink = query<HTMLAnchorElement>(
			card,
			"[data-memos-detail-link]",
		);
		detailLink.href = detailURL;
		detailLink.setAttribute("aria-label", `查看${accessibleTitle}的详情`);
		bindCardNavigation(card, detailLink);
	}
	for (const pin of card.querySelectorAll<HTMLElement>("[data-memos-pin]"))
		pin.hidden = !moment.pinned;
	const time = query<HTMLTimeElement>(card, "[data-memos-published]");
	time.dateTime = moment.published.toISOString();
	time.setAttribute("aria-label", `发布于 ${dateText}`);
	time.textContent = formatMomentPublicationDate(moment.published);
	time.title = dateText;
	const tags = query(card, "[data-memos-tags]");
	const visibleTags = moment.tags.filter(
		(tag) => tag !== page.config.publicationTag,
	);
	tags.hidden = visibleTags.length === 0;
	tags.replaceChildren(...visibleTags.map(createTag));
	card.dataset.hasTags = String(visibleTags.length > 0);
	if (page.detail) {
		const location = query(card, "[data-memos-location]");
		location.hidden = !moment.location;
		query(location, "[data-memos-location-text]").textContent = moment.location;
		const edited = query(card, "[data-memos-edited]");
		edited.hidden = moment.updated.getTime() <= moment.published.getTime();
		const updated = query<HTMLTimeElement>(edited, "[data-memos-updated]");
		const updatedText = formatMomentDate(moment.updated, "dateTime");
		updated.dateTime = moment.updated.toISOString();
		updated.textContent = formatMomentPublicationDate(moment.updated);
		updated.title = updatedText;
		updated.setAttribute("aria-label", updatedText);
		query(card, "[data-memos-meta-secondary]").hidden = !moment.pinned;
	}

	const rendered = renderMemosContent(moment, page.config.serverURL);
	const content = query(card, "[data-memos-content]");
	content.innerHTML = rendered.html;
	for (const img of content.querySelectorAll<HTMLImageElement>(
		"img[data-memos-original-src]",
	)) {
		const original = img.dataset.memosOriginalSrc;
		const fallback = img.dataset.memosFallbackSrc;
		const sources = [...new Set([img.src, original, fallback])].filter(
			(src): src is string => Boolean(src),
		);
		let sourceIndex = 0;
		img.addEventListener("error", () => {
			const next = sources[++sourceIndex];
			if (!next) return;
			const link = img.closest("a");
			if (next === fallback && link && link.href === original) link.href = next;
			img.src = next;
		});
	}
	const hasBody = Boolean(
		content.textContent?.trim() || content.querySelector("img"),
	);
	content.hidden = !hasBody;
	const gallery = query(card, "[data-memos-gallery]");
	gallery.hidden = rendered.images.length === 0;
	gallery.dataset.count = String(
		page.detail ? rendered.images.length : Math.min(9, rendered.images.length),
	);
	gallery.setAttribute(
		"aria-label",
		`动态配图，共 ${rendered.images.length} 张`,
	);
	for (const [index, image] of rendered.images.entries()) {
		const trigger = cloneTemplate<HTMLButtonElement>(
			page.root,
			"[data-memos-image-template]",
		);
		trigger.dataset.pswpSrc = image.src;
		if (image.fallbackSrc) trigger.dataset.pswpFallbackSrc = image.fallbackSrc;
		// Hidden thumbnails remain part of the complete PhotoSwipe album.
		trigger.hidden = !page.detail && index >= 9;
		if (image.width && image.height) {
			trigger.dataset.pswpWidth = String(image.width);
			trigger.dataset.pswpHeight = String(image.height);
		}
		const alt = image.alt || `动态配图 ${index + 1}`;
		trigger.setAttribute(
			"aria-label",
			`查看配图 ${index + 1}/${rendered.images.length}：${alt}`,
		);
		const img = query<HTMLImageElement>(trigger, "img");
		img.alt = alt;
		img.loading = page.detail && index === 0 ? "eager" : "lazy";
		const sources = [
			...new Set(
				[
					image.thumbnail,
					image.src,
					image.fallbackThumbnail,
					image.fallbackSrc,
				].filter((src): src is string => Boolean(src)),
			),
		];
		let sourceIndex = 0;
		img.addEventListener("error", () => {
			const next = sources[++sourceIndex];
			if (next) {
				if (
					image.fallbackSrc &&
					(next === image.fallbackThumbnail || next === image.fallbackSrc)
				)
					trigger.dataset.pswpSrc = image.fallbackSrc;
				img.src = next;
				return;
			}
			img.hidden = true;
			trigger.classList.add("moment-media-trigger--error");
			const message = document.createElement("span");
			message.className = "moment-media-error";
			message.textContent = "图片未能加载，点击查看原图";
			trigger.append(message);
		});
		img.src = image.thumbnail;
		gallery.append(trigger);
	}
	if (!page.detail && rendered.images.length > 1) {
		const open = document.createElement("button");
		open.type = "button";
		open.className = "moment-album-open";
		open.dataset.memosAlbumOpen = "";
		open.textContent = `查看 ${rendered.images.length} 张`;
		open.setAttribute(
			"aria-label",
			`打开相册，共 ${rendered.images.length} 张图片`,
		);
		gallery.append(open);
	}
	query<HTMLAnchorElement>(card, "[data-memos-comment-link]").href =
		`${detailURL}#moment-interactions`;
	query(card, ".moment-comment-count").dataset.path = detailURL;
	const share = query(card, "[data-moment-share]");
	share.dataset.shareUrl = new URL(detailURL, window.location.origin).href;
	share.dataset.shareTitle = accessibleTitle;
	return card;
}
