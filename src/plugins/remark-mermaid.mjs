import { visit } from "unist-util-visit";

function escapeHtml(value) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

export function remarkMermaid() {
	return (tree) => {
		visit(tree, "code", (node, index, parent) => {
			if (!parent || typeof index !== "number") return;
			if (node.lang !== "mermaid") return;

			const source = escapeHtml(node.value || "");
			parent.children[index] = {
				type: "html",
				value: `<div class="mermaid-diagram" data-mermaid-pending="true"><div class="mermaid-placeholder">图表加载中...</div><pre class="mermaid-source" data-pagefind-ignore="true" aria-hidden="true">${source}</pre></div>`,
			};
		});
	};
}
