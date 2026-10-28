export function query<T extends Element = HTMLElement>(
	root: ParentNode,
	selector: string,
): T {
	const element = root.querySelector<T>(selector);
	if (!element) throw new Error(`Missing Memos element: ${selector}`);
	return element;
}

export function cloneTemplate<T extends HTMLElement>(
	root: HTMLElement,
	selector: string,
): T {
	const template = query<HTMLTemplateElement>(root, selector);
	return template.content.firstElementChild?.cloneNode(true) as T;
}
