import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname } from "node:path";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const distDir = join(scriptDir, "..", "dist");
const htmlPath = join(distDir, "bangumi", "index.html");
const dataPath = join(distDir, "bangumi", "data.json");

const maxHtmlSizeKb = 220;
const maxServerRenderedCards = 24;

function fail(message) {
	console.error(`[bangumi-lightweight] ${message}`);
	process.exitCode = 1;
}

if (!existsSync(htmlPath)) {
	fail(`Missing built page: ${htmlPath}`);
} else {
	const html = readFileSync(htmlPath, "utf8");
	const htmlSizeKb = statSync(htmlPath).size / 1024;
	const cardCount = (html.match(/class="bangumi-card\b/g) ?? []).length;

	if (htmlSizeKb > maxHtmlSizeKb) {
		fail(
			`HTML is ${htmlSizeKb.toFixed(1)} KB, expected <= ${maxHtmlSizeKb} KB.`,
		);
	}

	if (cardCount > maxServerRenderedCards) {
		fail(
			`Found ${cardCount} server-rendered cards, expected <= ${maxServerRenderedCards}.`,
		);
	}
}

if (!existsSync(dataPath)) {
	fail(`Missing lazy data endpoint: ${dataPath}`);
} else {
	const data = JSON.parse(readFileSync(dataPath, "utf8"));
	if (!data || typeof data !== "object" || !Array.isArray(data.tabs)) {
		fail("Lazy data endpoint does not expose a tabs array.");
	}
}

if (!process.exitCode) {
	console.log("[bangumi-lightweight] OK");
}
