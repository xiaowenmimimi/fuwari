import { definePlugin } from "@expressive-code/core";

/**
 * 让代码块支持 nocollapse，用于单独关闭超长自动折叠。
 * 用法：```ts nocollapse
 * 折叠行为本身在 src/scripts/codeblock-collapse.ts。
 */
export function pluginCollapseOptOut() {
	return definePlugin({
		name: "Collapse Opt Out",
		hooks: {
			postprocessRenderedBlock: (context) => {
				if (!context.codeBlock.metaOptions.getBoolean("nocollapse")) return;

				const root = context.renderData.blockAst;
				const className = root.properties.className;
				if (Array.isArray(className)) {
					className.push("no-collapse");
				} else {
					root.properties.className = ["no-collapse"];
				}
			},
		},
	});
}
