import type {
	ExpressiveCodeConfig,
	LicenseConfig,
	NavBarConfig,
	ProfileConfig,
	SiteConfig,
} from "./types/config";
import { LinkPreset } from "./types/config";

export const siteConfig: SiteConfig = {
	title: "Wen", // 网站标题&首页标题
	subtitle: "(╹ڡ╹ )", // 网站副标题
	homeSubtitle: "恐怖才是自由，君临才是解放，矛盾才是真理。", // 首页副标题
	launchDate: "2025-12-18", // 上线日期
	lang: "zh_CN", // Language code, e.g. 'en', 'zh_CN', 'ja', etc.
	themeColor: {
		// 用户未手动设置主题色时, 网站主题色会在这些预设中随机选择
		presets: [
			{ name: "夜蓝", hue: 250 },
			{ name: "薄荷", hue: 165 },
			{ name: "樱粉", hue: 345 },
			{ name: "夕烧", hue: 25 },
			{ name: "林间", hue: 120 },
			{ name: "海雾", hue: 200 },
		],
		fixed: false, // Hide the theme color picker for visitors
	},
	banner: {
		enable: true,
		src: {
			random: true, // 是否启用随机横幅图；false 时只使用 fallback，不请求随机图片接口
			fallback: [
				"assets/images/Cinnabar 2.png",
				"assets/images/20260109-mini.png",
				"assets/images/wallhaven-13mrg3-mini.jpg",
			], // 兜底横幅图：随机接口关闭、请求失败或随机图片未加载完成前显示；路径规则同原 src
			api: "https://imgbed.xhwen.cn/random?dir=banner&orientation=auto", // 随机图片信息接口，返回格式示例：{"url":"/file/banner/xxx.webp"}
			ossBase: "https://image.xhwen.cn", // OSS/CDN 访问域名，会把 /file/banner/xxx.webp 转换为 https://image.xhwen.cn/banner/xxx.webp
		},
		position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
		credit: {
			enable: false, // Display the credit text of the banner image
			text: ["Author 1", "Author 2", "Author 3"], // Credit text to be displayed
			url: ["", "", ""], // (Optional) URL link to the original artwork or artist's page
		},
	},
	toc: {
		enable: true, // Display the table of contents on the right side of the post
		depth: 2, // Maximum heading depth to show in the table, from 1 to 3
	},
	favicon: [
		// Leave this array empty to use the default favicon
		// {
		//   src: '/favicon/icon.png',    // Path of the favicon, relative to the /public directory
		//   theme: 'light',              // (Optional) Either 'light' or 'dark', set only if you have different favicons for light and dark mode
		//   sizes: '32x32',              // (Optional) Size of the favicon, set only if you have favicons of different sizes
		// }
	],
	waline: {
		serverURL: "https://comment.xhwen.cn", // Waline 服务端地址（必填）
		lang: "zh-CN", // 评论区语言（可选），例如 zh-CN 、 en
		login: "enable", // 登录方式（可选），例如 enable / disable / force
		dark: "html.dark", // 暗色模式选择器（可选），默认 html.dark
		imageUpload: {
			endpoint: "https://upload-img.xhwen.top/upload",
			token: import.meta.env.PUBLIC_WALINE_IMAGE_UPLOAD_TOKEN ?? "",
			maxSizeMB: 20,
		},
	},
	umami: {
		host: "https://analytics.xhwen.cn", // Umami 服务端地址
		apiKey: "change_me", // Umami 服务端 API 密钥
	},
};

export const navBarConfig: NavBarConfig = {
	links: [
		LinkPreset.Home,
		LinkPreset.Archive,
		{
			// Bangumi 功能参考：https://kasuha.com/posts/fuwari-enhance-ep2/
			name: "Bangumi",
			url: "/bangumi/",
		},
		// {
		// 	name: "GitHub",
		// 	url: "https://github.com/saicaca/fuwari", // Internal links should not include the base path, as it is automatically added
		// 	external: true, // Show an external link icon and will open in a new tab
		// },
		LinkPreset.About,
	],
};

export const profileConfig: ProfileConfig = {
	avatar: "assets/images/head_portrait.png", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
	name: "朗姆提子冰淇淋",
	bio: "因为喜欢所以创建了博客\nCiallo～(∠・ω< )⌒☆",
	links: [
		// {
		// 	name: "Twitter",
		// 	icon: "fa6-brands:twitter", // Visit https://icones.js.org/ for icon codes
		// 	// You will need to install the corresponding icon set if it's not already included
		// 	// `pnpm add @iconify-json/<icon-set-name>`
		// 	url: "https://twitter.com",
		// },
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://steamcommunity.com/profiles/76561198855701189/",
		},
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/xiaowenmimimi/fuwari",
		},
		{
			name: "Email",
			icon: "fa6-solid:envelope",
			url: "mailto:1847559091@qq.com",
		},
	],
};

export const licenseConfig: LicenseConfig = {
	enable: true,
	name: "CC BY-NC-SA 4.0",
	url: "https://creativecommons.org/licenses/by-nc-sa/4.0/",
};

export const expressiveCodeConfig: ExpressiveCodeConfig = {
	// Note: Some styles (such as background color) are being overridden, see the astro.config.mjs file.
	// Please select a dark theme, as this blog theme currently only supports dark background color
	theme: "github-dark",
};
