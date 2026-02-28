/// <reference types="mdast" />
import { h } from "hastscript";

/**
 * 创建链接卡片组件 (Link Card Component)
 *
 * 该组件用于在 Markdown 中渲染类似 Twitter/Notion 的富文本链接卡片。
 * 使用方式: ::link-card{title="标题" url="链接" desc="描述" image="图片URL" badge="角标" target="_blank"}
 *
 * @param {Object} properties - 组件属性
 * @param {string} properties.title - 链接标题 (必填)
 * @param {string} properties.url - 跳转链接 (必填)
 * @param {string} [properties.desc] - 链接描述 (可选)
 * @param {string} [properties.image] - 封面图片 URL (可选)
 * @param {string} [properties.badge] - 右上角角标文本 (可选)
 * @param {string} [properties.target] - 链接打开方式 (可选，默认为 _blank)
 * @param {import('mdast').RootContent[]} children - 子元素 (该指令应为叶子节点，不应包含子元素)
 * @returns {import('mdast').Parent} 生成的 HAST 节点树
 */
export function LinkCardComponent(properties, children) {
  // 校验: link-card 必须是叶子节点，不能包裹其他内容
  if (Array.isArray(children) && children.length !== 0)
    return h("div", { class: "hidden" }, [
      'Invalid directive. ("link-card" directive must be leaf type "::link-card{title="..." url="..."}")',
    ]);

  // 校验: title 和 url 是必填项
  if (!properties.title || !properties.url)
    return h(
      "div",
      { class: "hidden" },
      'Invalid link card. ("title" and "url" attributes are required)',
    );

  const { title, url, desc, image, badge, target } = properties;
  
  // 判断是否为站内链接 (以 / 或 # 开头)
  const isInternal = url.startsWith("/") || url.startsWith("#");

  // 智能设置 target:
  // 1. 如果用户显式指定了 target，则使用用户的设置
  // 2. 如果是站内链接，默认在当前页打开 (_self)
  // 3. 如果是外部链接，默认在新标签页打开 (_blank)
  const finalTarget = target ? target : isInternal ? "_self" : "_blank";

  // 提取域名用于显示 (例如: google.com)
  let domain = "";
  try {
    const urlObj = new URL(url, "http://n");
    domain = urlObj.hostname === "n" ? url : urlObj.hostname;
  } catch (_e) {
    domain = url;
  }

  // 构建内容容器 (左侧/上方区域)
  const nTitle = h("div", { class: "cl-title" }, title);
  const nDesc = desc ? h("div", { class: "cl-desc" }, desc) : null;
  const nDomain = h("div", { class: "cl-domain" }, [
    h("span", { class: "cl-icon-prefix" }, "🔗"),
    domain,
  ]);

  const nContent = h(
    "div",
    { class: "cl-content" },
    [nTitle, nDesc, nDomain].filter(Boolean),
  );

  // 构建封面图 (右侧区域)
  let nCover = null;
  if (image) {
    nCover = h("div", {
      class: "cl-cover",
      style: `background-image: url('${image}')`,
    });
  }

  // 构建角标 (右上角)
  let nBadge = null;
  if (badge) {
    nBadge = h("div", { class: "cl-badge" }, badge);
  }

  // 返回最终的 <a> 标签结构
  return h(
    "a",
    {
      class: "card-link no-styling",
      href: url,
      target: finalTarget,
      // 安全性: 外部链接添加 noopener noreferrer
      rel: finalTarget === "_blank" ? "noopener noreferrer" : undefined,
    },
    [nContent, nCover, nBadge].filter(Boolean),
  );
}
