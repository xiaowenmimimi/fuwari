import { createWalineImageUploader } from "@utils/waline-image-uploader";
import { WalineController } from "./waline-controller";

type WalineClient = typeof import("@waline/client/full");
type WalineInitOptions = Parameters<WalineClient["init"]>[0];

const isWalineLoginStatus = (
	value: string,
): value is NonNullable<WalineInitOptions["login"]> =>
	value === "enable" || value === "disable" || value === "force";

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
		el,
		serverURL: serverUrl || "",
		path: pageKey,
		dark: dark || "html.dark",
		requiredMeta: ["nick", "mail"],
		locale: {
			nickError: "请填写昵称后再提交。",
			mailError: "请填写有效的邮箱地址后再提交。",
			sofa: "还没有评论，写下第一句吧。",
		},
		emoji: [
			"https://unpkg.com/@ljxme/walineqaq@1.1.3/heybox_cube",
			"https://unpkg.com/@ljxme/walineqaq@1.1.3/heybox_heniang",
			"https://unpkg.com/@waline/emojis@1.4.0/bilibili",
			"https://unpkg.com/@waline/emojis@1.4.0/tieba",
		],
		// 暂停表情包搜索，后续接入自定义接口。
		search: false,
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

const controller = new WalineController(
	() => import("@waline/client/full"),
	getWalineOptions,
);
controller.start();
if (import.meta.hot) import.meta.hot.dispose(() => controller.stop());
