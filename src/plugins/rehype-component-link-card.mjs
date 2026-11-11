/// <reference types="mdast" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { h, s } from "hastscript";

/**
 * 创建链接卡片组件 (Link Card Component)
 *
 * 书签卡样式：左侧标题 / 描述 / 元信息，右侧可选图片区。
 * 使用方式: ::link-card{title="标题" url="链接" desc="描述" image="图片URL" fit="cover" badge="角标" target="_blank"}
 *
 * - 外链：元信息行显示 favicon（取 image）+ 主机名 + 路径 + badge；image 默认按 logo 居中显示。
 * - 站内文章（/posts/<slug>/）：构建时读取目标文章 frontmatter，自动填充 title、desc、
 *   image、分类和发布日期，卡片上写了的属性优先；image 默认按封面铺满显示。
 *   站内卡片不显示 badge，元信息行固定为「站内文章 · 分类 · 日期」。
 * - fit：覆盖图片填充方式。外链用照片、截图等非 logo 图片时写 fit="cover"，
 *   此时 URL 行不再拿这张图当 favicon，改用链接图标。
 *
 * @param {Object} properties - 组件属性
 * @param {string} properties.url - 跳转链接 (必填)
 * @param {string} [properties.title] - 链接标题 (外链必填；站内文章可省略，自动读取)
 * @param {string} [properties.desc] - 链接描述 (可选)
 * @param {string} [properties.image] - 外链为 logo，站内为封面图 (可选)
 * @param {"cover"|"contain"} [properties.fit] - 图片填充方式 (可选，外链默认 contain，站内默认 cover)
 * @param {string} [properties.badge] - 外链元信息行末尾的标签 (可选)
 * @param {string} [properties.target] - 链接打开方式 (可选，站内默认 _self，外链默认 _blank)
 * @param {import('mdast').RootContent[]} children - 子元素 (该指令应为叶子节点，不应包含子元素)
 * @returns {import('mdast').Parent} 生成的 HAST 节点树
 */
export function LinkCardComponent(properties, children) {
	// 校验: link-card 必须是叶子节点，不能包裹其他内容
	if (Array.isArray(children) && children.length !== 0)
		return h("div", { class: "hidden" }, [
			'Invalid directive. ("link-card" directive must be leaf type "::link-card{title="..." url="..."}")',
		]);

	const { url, badge, target } = properties;
	if (!url)
		return h(
			"div",
			{ class: "hidden" },
			'Invalid link card. ("url" attribute is required)',
		);

	// 判断是否为站内链接 (以 / 或 # 开头)
	const isInternal = url.startsWith("/") || url.startsWith("#");
	const post = isInternal ? readPostFrontmatter(url) : null;

	const title = properties.title || post?.title;
	if (!title)
		return h(
			"div",
			{ class: "hidden" },
			`Invalid link card. ("title" is required, or "url" must point to an existing post: ${url})`,
		);

	const desc = properties.desc || post?.description || "";
	const image = properties.image || usableImage(post?.image);
	// 图片填充方式: 显式指定 > 站内 cover (封面) > 外链 contain (logo)
	const fit =
		properties.fit === "cover" || properties.fit === "contain"
			? properties.fit
			: isInternal
				? "cover"
				: "contain";

	// 智能设置 target: 显式指定 > 站内 _self > 外链 _blank
	const finalTarget = target ? target : isInternal ? "_self" : "_blank";

	const nTitle = h("span", { class: "cl-title" }, title);
	const nDesc = desc ? h("span", { class: "cl-desc" }, desc) : null;
	const nMeta = isInternal
		? internalMeta(url, post)
		: externalMeta(url, fit === "contain" ? image : "", badge);

	const nBody = h(
		"span",
		{ class: "cl-body" },
		[nTitle, nDesc, nMeta].filter(Boolean),
	);

	const nMedia = image
		? h(
				"span",
				{
					class: `cl-media ${fit === "cover" ? "cl-media--cover" : "cl-media--logo"}`,
				},
				[
					h("img", {
						src: image,
						alt: "",
						loading: "lazy",
						decoding: "async",
					}),
				],
			)
		: null;

	return h(
		"a",
		{
			class: `card-link no-styling ${isInternal ? "is-internal" : "is-external"}`,
			href: url,
			target: finalTarget,
			// 安全性: 新标签页打开时添加 noopener noreferrer
			rel: finalTarget === "_blank" ? "noopener noreferrer" : undefined,
		},
		[nBody, nMedia].filter(Boolean),
	);
}

/** 外链元信息行: favicon + 主机名 + 路径 + badge */
function externalMeta(url, image, badge) {
	let host = url;
	let pathname = "";
	try {
		const u = new URL(url);
		host = u.hostname;
		pathname = `${u.pathname}${u.search}`;
		if (pathname === "/") pathname = "";
	} catch (_e) {
		// 非法 URL 时整体当作主机名显示
	}

	const nIcon = image
		? h("img", {
				class: "cl-favicon",
				src: image,
				alt: "",
				loading: "lazy",
				decoding: "async",
			})
		: icon("link");

	return h(
		"span",
		{ class: "cl-meta" },
		[
			nIcon,
			h("span", { class: "cl-host" }, host),
			pathname ? h("span", { class: "cl-path" }, pathname) : null,
			badge ? h("span", { class: "cl-badge" }, badge) : null,
		].filter(Boolean),
	);
}

/** 站内元信息行: 站内文章 · 分类 · 日期；非文章页面显示 本站 + 路径 */
function internalMeta(url, post) {
	const nDoc = h("span", { class: "cl-doc" }, [icon("doc")]);
	if (!post)
		return h("span", { class: "cl-meta" }, [
			nDoc,
			h("span", { class: "cl-host" }, "本站"),
			h("span", { class: "cl-path" }, url),
		]);

	const parts = [nDoc, h("span", { class: "cl-host" }, "站内文章")];
	if (post.category)
		parts.push(sep(), h("span", { class: "cl-category" }, post.category));
	if (post.published)
		parts.push(
			sep(),
			h("time", { class: "cl-date", datetime: post.published }, post.published),
		);
	return h("span", { class: "cl-meta" }, parts);
}

function sep() {
	return h("span", { class: "cl-sep", "aria-hidden": "true" }, "·");
}

const ICON_PATHS = {
	link: "M6.8 9.2a2.6 2.6 0 0 0 3.7 0l2-2a2.6 2.6 0 0 0-3.7-3.7l-.8.8M9.2 6.8a2.6 2.6 0 0 0-3.7 0l-2 2a2.6 2.6 0 0 0 3.7 3.7l.8-.8",
	doc: "M4 2.5h4.8L12 5.7v7.8H4zM8.6 2.7v3.2H12M6 8.6h4M6 11h3",
};

function icon(name) {
	return s(
		"svg",
		{
			class: `cl-icon cl-icon--${name}`,
			viewBox: "0 0 16 16",
			"aria-hidden": "true",
		},
		[
			s("path", {
				d: ICON_PATHS[name],
				fill: "none",
				stroke: "currentColor",
				strokeWidth: "1.4",
				strokeLinecap: "round",
				strokeLinejoin: "round",
			}),
		],
	);
}

/**
 * frontmatter 的 image 只有完整 URL 或 public/ 下的绝对路径可以直接使用；
 * 相对文章的路径会经过 Astro 图片处理（文件名带哈希），插件拿不到最终地址，忽略。
 */
function usableImage(image) {
	if (!image) return "";
	return /^(https?:)?\/\//.test(image) || image.startsWith("/") ? image : "";
}

const POSTS_DIR = path.resolve(process.cwd(), "src/content/posts");
const POST_EXT = /\.mdx?$/;

/** slug → 文章文件绝对路径；首次查询时建立，查不到时重建一次 (dev 下可能新增了文章) */
let postIndex = null;

/**
 * 按 Astro 的规则从文件相对路径生成 slug：每段做 github-slugger 处理
 * (转小写、去掉标点、空格转 -)，再去掉末尾的 /index。
 * 例如 markdown-zh-CN.md → markdown-zh-cn，guide/index.md → guide。
 */
function toSlug(relPath) {
	return relPath
		.replace(POST_EXT, "")
		.split(/[\\/]/)
		.map((seg) =>
			seg
				.toLowerCase()
				.replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, "")
				.replace(/ /g, "-"),
		)
		.join("/")
		.replace(/\/index$/, "");
}

function buildPostIndex() {
	const index = new Map();
	if (!existsSync(POSTS_DIR)) return index;
	for (const rel of readdirSync(POSTS_DIR, { recursive: true })) {
		if (POST_EXT.test(rel)) index.set(toSlug(rel), path.join(POSTS_DIR, rel));
	}
	return index;
}

function findPostFile(slug) {
	const key = toSlug(slug);
	if (!postIndex?.has(key)) postIndex = buildPostIndex();
	return postIndex.get(key);
}

/**
 * 根据站内 URL (/posts/<slug>/) 找到对应文章并读取 frontmatter。
 * 草稿文章在生产环境不会生成页面，此时返回 null，卡片退回「本站」样式。
 */
function readPostFrontmatter(url) {
	const match = url.split(/[?#]/)[0].match(/^\/posts\/(.+?)\/?$/);
	if (!match) return null;

	let slug;
	try {
		slug = decodeURIComponent(match[1]);
	} catch (_e) {
		return null;
	}

	const file = findPostFile(slug);
	if (!file) {
		console.warn(`[link-card] 找不到站内文章: ${url}`);
		return null;
	}

	let post;
	try {
		post = parseFrontmatter(readFileSync(file, "utf-8"));
	} catch (_e) {
		return null;
	}

	if (post?.draft) {
		console.warn(
			`[link-card] 目标文章是草稿，生产环境不会生成页面，链接将失效: ${url}`,
		);
		if (process.env.NODE_ENV === "production") return null;
	}
	return post;
}

/**
 * 只解析卡片需要的几个 frontmatter 字段 (单行 key: value)，
 * 不追求完整 YAML 支持；解析不到的字段直接视为空。
 */
function parseFrontmatter(source) {
	const block = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!block) return null;

	const data = {};
	for (const line of block[1].split(/\r?\n/)) {
		const m = line.match(
			/^(title|description|image|category|published|draft):\s*(.*)$/,
		);
		if (m) data[m[1]] = unquote(m[2].trim());
	}

	const published = /^\d{4}-\d{2}-\d{2}/.exec(data.published || "");
	return {
		title: data.title || "",
		description: data.description || "",
		image: data.image || "",
		category: data.category || "",
		published: published ? published[0] : "",
		draft: data.draft === "true",
	};
}

function unquote(value) {
	const m = value.match(/^(["'])(.*)\1$/);
	if (!m) return value.replace(/\s+#.*$/, "");
	return m[1] === "'" ? m[2].replace(/''/g, "'") : m[2].replace(/\\"/g, '"');
}
