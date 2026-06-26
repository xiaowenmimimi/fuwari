import {
	AUTO_MODE,
	DARK_MODE,
	DEFAULT_THEME,
	LIGHT_MODE,
} from "@constants/constants.ts";
import { expressiveCodeConfig } from "@/config";
import type { LIGHT_DARK_MODE, ThemeColorPreset } from "@/types/config";

function getConfigCarrier() {
	return document.getElementById("config-carrier");
}

function normalizeHue(value: number): number {
	if (!Number.isFinite(value)) return 250;
	return ((Math.round(value) % 361) + 361) % 361;
}

export function getThemePresets(): ThemeColorPreset[] {
	const configCarrier = getConfigCarrier();
	const rawPresets = configCarrier?.dataset.themePresets;
	if (!rawPresets) {
		return [];
	}

	try {
		const parsed = JSON.parse(rawPresets);
		if (!Array.isArray(parsed)) {
			return [];
		}

		return parsed.reduce<ThemeColorPreset[]>((result, item) => {
			const rawHue = Number(item?.hue);
			if (!Number.isFinite(rawHue)) {
				return result;
			}

			const hue = normalizeHue(rawHue);
			result.push({
				name:
					typeof item?.name === "string" && item.name.trim().length > 0
						? item.name.trim()
						: `Hue ${hue}`,
				hue,
			});
			return result;
		}, []);
	} catch {
		return [];
	}
}

export function getThemePresetName(hue: number): string {
	const normalizedHue = normalizeHue(hue);
	const preset = getThemePresets().find((item) => item.hue === normalizedHue);
	return preset?.name || `Hue ${normalizedHue}`;
}

export function emitHueChange(hue: number): void {
	const normalizedHue = normalizeHue(hue);
	document.dispatchEvent(
		new CustomEvent("theme-hue-change", {
			detail: {
				hue: normalizedHue,
				name: getThemePresetName(normalizedHue),
			},
		}),
	);
}

export function getDefaultHue(): number {
	const randomHue = document.documentElement.dataset.randomHue;
	if (randomHue) {
		return Number.parseInt(randomHue, 10);
	}
	const fallback = "250";
	const configCarrier = getConfigCarrier();
	return Number.parseInt(configCarrier?.dataset.hue || fallback, 10);
}

export function getHueCandidates(): number[] {
	const fallback = 250;
	const configCarrier = getConfigCarrier();
	const rawCandidates = configCarrier?.dataset.hueCandidates;
	const parsedCandidates = rawCandidates
		?.split(",")
		.map((value) => Number.parseInt(value.trim(), 10))
		.filter((value) => Number.isFinite(value));

	if (parsedCandidates?.length) {
		return parsedCandidates;
	}

	const rawFallback = Number.parseInt(
		configCarrier?.dataset.hue || String(fallback),
		10,
	);
	return [Number.isFinite(rawFallback) ? rawFallback : fallback];
}

export function getHue(): number {
	const stored = localStorage.getItem("hue");
	return stored ? Number.parseInt(stored, 10) : getDefaultHue();
}

export function setHue(hue: number): void {
	localStorage.setItem("hue", String(hue));
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	r.style.setProperty("--hue", String(hue));
	document.documentElement.dataset.randomHue = String(hue);
	emitHueChange(hue);
}

export function clearHue(): void {
	localStorage.removeItem("hue");
	const r = document.querySelector(":root") as HTMLElement;
	if (!r) {
		return;
	}
	const defaultHue = getDefaultHue();
	r.style.setProperty("--hue", String(defaultHue));
	document.documentElement.dataset.randomHue = String(defaultHue);
	emitHueChange(defaultHue);
}

export function applyThemeToDocument(theme: LIGHT_DARK_MODE) {
	switch (theme) {
		case LIGHT_MODE:
			document.documentElement.classList.remove("dark");
			break;
		case DARK_MODE:
			document.documentElement.classList.add("dark");
			break;
		case AUTO_MODE:
			if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
			break;
	}

	// Set the theme for Expressive Code
	document.documentElement.setAttribute(
		"data-theme",
		expressiveCodeConfig.theme,
	);
}

export function setTheme(theme: LIGHT_DARK_MODE): void {
	localStorage.setItem("theme", theme);
	applyThemeToDocument(theme);
}

export function getStoredTheme(): LIGHT_DARK_MODE {
	return (localStorage.getItem("theme") as LIGHT_DARK_MODE) || DEFAULT_THEME;
}
