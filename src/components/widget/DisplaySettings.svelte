<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import {
	emitHueChange,
	getDefaultHue,
	getHue,
	getHueCandidates,
	getThemePresetName,
	getThemePresets,
	setHue,
} from "@utils/setting-utils";

type PanelMode = "random" | "fixed" | "advanced";
type ThemePreset = {
	name: string;
	hue: number;
};

const advancedStep = 5;
const hueModeStorageKey = "hue-mode";

const normalizeHue = (value: number) => {
	if (!Number.isFinite(value)) return 250;
	return ((Math.round(value) % 361) + 361) % 361;
};
const randomHueCandidates = getHueCandidates().map(normalizeHue);
const defaultHue = getDefaultHue();
let hue = normalizeHue(getHue());
let mode: PanelMode = getInitialMode();

function getInitialMode(): PanelMode {
	const storedHue = localStorage.getItem("hue");
	const storedMode = localStorage.getItem(hueModeStorageKey);

	if (!storedHue) {
		localStorage.removeItem(hueModeStorageKey);
		return "random";
	}

	return storedMode === "advanced" ? "advanced" : "fixed";
}

function setPanelMode(nextMode: PanelMode) {
	mode = nextMode;
	if (nextMode === "random") {
		localStorage.removeItem(hueModeStorageKey);
		return;
	}
	localStorage.setItem(hueModeStorageKey, nextMode);
}

function dedupePresets(presets: ThemePreset[]) {
	return presets.reduce<ThemePreset[]>((result, preset) => {
		if (!result.some((item) => item.hue === preset.hue)) {
			result.push(preset);
		}
		return result;
	}, []);
}

const configuredPresets = dedupePresets(
	getThemePresets().map((preset) => ({
		name: preset.name,
		hue: normalizeHue(preset.hue),
	})),
);
const fallbackPresets = dedupePresets(
	randomHueCandidates.map((value) => ({
		name: getThemePresetName(value),
		hue: normalizeHue(value),
	})),
);
const palettePresets =
	configuredPresets.length > 0 ? configuredPresets : fallbackPresets;

$: canReset = mode !== "random" || hue !== normalizeHue(defaultHue);

function getThemeLabel(value: number) {
	const normalized = normalizeHue(value);
	return (
		palettePresets.find((preset) => preset.hue === normalized)?.name ||
		getThemePresetName(normalized)
	);
}

function applyTransientHue(nextHue: number) {
	hue = normalizeHue(nextHue);
	document.documentElement.dataset.randomHue = String(hue);
	document.documentElement.style.setProperty("--hue", String(hue));
	emitHueChange(hue);
}

function pickRandomHue() {
	const candidates =
		randomHueCandidates.length > 0
			? randomHueCandidates
			: [normalizeHue(defaultHue)];
	const nextCandidates =
		candidates.length > 1
			? candidates.filter((candidate) => candidate !== normalizeHue(hue))
			: candidates;
	const pool = nextCandidates.length > 0 ? nextCandidates : candidates;
	return (
		pool[Math.floor(Math.random() * pool.length)] ?? normalizeHue(defaultHue)
	);
}

function useRandomHue() {
	localStorage.removeItem("hue");
	setPanelMode("random");
	applyTransientHue(pickRandomHue());
}

function fixCurrentHue() {
	setPanelMode("fixed");
	hue = normalizeHue(hue);
	setHue(hue);
}

function selectPreset(nextHue: number) {
	setPanelMode("fixed");
	hue = normalizeHue(nextHue);
	setHue(hue);
}

function showAdvanced() {
	setPanelMode("advanced");
	hue = normalizeHue(hue);
	setHue(hue);
}

function setAdvancedHue(nextHue: number) {
	setPanelMode("advanced");
	hue = normalizeHue(nextHue);
	setHue(hue);
}

function adjustAdvancedHue(delta: number) {
	const nextHue = ((Math.round(hue + delta) % 360) + 360) % 360;
	setAdvancedHue(nextHue);
}

function updateAdvancedHue(event: Event) {
	const input = event.currentTarget as HTMLInputElement;
	setAdvancedHue(Number(input.value));
}

function resetHue() {
	localStorage.removeItem("hue");
	setPanelMode("random");
	applyTransientHue(normalizeHue(defaultHue));
}
</script>

<div
	id="display-setting"
	class="float-panel float-panel-closed absolute right-4 px-4 py-4 transition-all"
>
	<div class="theme-panel-head">
		<div class="theme-panel-copy">
			<div class="theme-panel-title">颜色主题</div>
		</div>
		<div class="theme-panel-actions">
			<div id="hueValue" class="hue-badge">Hue {hue}</div>
			<button
				aria-label="Reset to Default"
				class="reset-button"
				class:is-hidden={!canReset}
				on:click={resetHue}
				type="button"
			>
				<Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.75rem]" />
			</button>
		</div>
	</div>

	<div class="mode-tabs" role="group" aria-label="Theme color mode">
		<button
			type="button"
			class:active={mode === "random"}
			aria-pressed={mode === "random"}
			on:click={useRandomHue}
		>
			随机
		</button>
		<button
			type="button"
			class:active={mode === "fixed"}
			aria-pressed={mode === "fixed"}
			on:click={fixCurrentHue}
		>
			固定
		</button>
		<button
			type="button"
			class:active={mode === "advanced"}
			aria-pressed={mode === "advanced"}
			on:click={showAdvanced}
		>
			高级
		</button>
	</div>

	<div class="theme-palette" aria-label="Theme color presets">
		{#each palettePresets as preset}
			<button
				type="button"
				class="theme-preset"
				class:active={preset.hue === normalizeHue(hue)}
				style={`--tone-hue: ${preset.hue}`}
				on:click={() => selectPreset(preset.hue)}
				aria-label={`${preset.name} Hue ${preset.hue}`}
			>
				<span>{preset.name}</span>
				<small>Hue {preset.hue}</small>
			</button>
		{/each}
	</div>

	{#if mode === "advanced"}
		<div class="advanced-panel">
			<div class="advanced-control" style={`--tone-hue: ${hue}`}>
				<button
					aria-label={`Hue -${advancedStep}`}
					class="advanced-step-button"
					on:click={() => adjustAdvancedHue(-advancedStep)}
					type="button"
				>
					-{advancedStep}
				</button>
				<div class="advanced-readout">
					<span>Hue</span>
					<strong>{hue}</strong>
				</div>
				<button
					aria-label={`Hue +${advancedStep}`}
					class="advanced-step-button"
					on:click={() => adjustAdvancedHue(advancedStep)}
					type="button"
				>
					+{advancedStep}
				</button>
			</div>
			<div class="slider-shell">
				<input
					aria-label={i18n(I18nKey.themeColor)}
					type="range"
					min="0"
					max="360"
					value={hue}
					class="slider"
					id="colorSlider"
					step={advancedStep}
					on:input={updateAdvancedHue}
				/>
			</div>
		</div>
	{/if}
</div>


<style>
	#display-setting {
		width: min(21rem, calc(100vw - 2rem));
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 255, 255, 0.72)),
			var(--float-panel-bg);
		border: 1px solid rgba(255, 255, 255, 0.68);
		box-shadow:
			0 22px 70px rgba(38, 56, 86, 0.16),
			inset 0 1px 0 rgba(255, 255, 255, 0.7);
		backdrop-filter: blur(22px) saturate(1.5);
		-webkit-backdrop-filter: blur(22px) saturate(1.5);
	}

	:global(.dark) #display-setting {
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
			var(--float-panel-bg);
		border-color: rgba(255, 255, 255, 0.1);
		box-shadow:
			0 22px 70px rgba(0, 0, 0, 0.34),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}

	.theme-panel-head,
	.theme-panel-actions {
		display: flex;
		align-items: center;
	}

	.theme-panel-copy {
		min-width: 0;
		flex: 1;
	}

	.theme-panel-head {
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.theme-panel-actions {
		gap: 0.4rem;
	}

	.theme-panel-title {
		color: rgba(23, 23, 23, 0.92);
		font-size: 1rem;
		font-weight: 800;
		line-height: 1.2;
	}

	:global(.dark) .theme-panel-title {
		color: rgba(255, 255, 255, 0.9);
	}

	.hue-badge,
	.reset-button {
		min-height: 1.9rem;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--primary) 18%, transparent);
		background: color-mix(in srgb, var(--primary) 9%, transparent);
		color: color-mix(in srgb, var(--primary) 84%, #172033);
		font-size: 0.72rem;
		font-weight: 800;
	}

	:global(.dark) .hue-badge,
	:global(.dark) .reset-button {
		color: color-mix(in srgb, var(--primary) 82%, white);
		background: color-mix(in srgb, var(--primary) 12%, transparent);
	}

	.hue-badge {
		display: inline-flex;
		align-items: center;
		padding: 0 0.65rem;
		white-space: nowrap;
	}

	.reset-button {
		width: 1.9rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition:
			opacity 160ms ease,
			transform 160ms ease,
			background 160ms ease;
	}

	.reset-button:hover {
		background: color-mix(in srgb, var(--primary) 15%, transparent);
	}

	.reset-button:active {
		transform: scale(0.94);
	}

	.reset-button.is-hidden {
		opacity: 0;
		pointer-events: none;
	}

	.mode-tabs {
		display: flex;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
		padding: 0.3rem;
		border-radius: 0.95rem;
		background: rgba(255, 255, 255, 0.58);
		border: 1px solid rgba(255, 255, 255, 0.66);
	}

	:global(.dark) .mode-tabs {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.mode-tabs button {
		flex: 1;
		height: 1.9rem;
		border-radius: 0.7rem;
		color: rgba(23, 23, 23, 0.58);
		font-size: 0.75rem;
		font-weight: 800;
		transition:
			background 180ms ease,
			color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	:global(.dark) .mode-tabs button {
		color: rgba(255, 255, 255, 0.58);
	}

	.mode-tabs button.active {
		color: white;
		background: color-mix(in srgb, var(--primary) 82%, #172033);
		box-shadow: 0 8px 20px color-mix(in srgb, var(--primary) 18%, transparent);
	}

	.mode-tabs button:active,
	.advanced-step-button:active,
	.theme-preset:active {
		transform: scale(0.98);
	}

	.theme-palette {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.5rem;
	}

	.theme-preset {
		--tone-color: oklch(0.7 0.14 var(--tone-hue));
		min-height: 4rem;
		padding: 0.55rem;
		text-align: left;
		border-radius: 1rem;
		background:
			radial-gradient(circle at 100% 0, color-mix(in srgb, var(--tone-color) 42%, transparent), transparent 66%),
			rgba(255, 255, 255, 0.58);
		border: 1px solid color-mix(in srgb, var(--tone-color) 20%, rgba(255, 255, 255, 0.74));
		color: rgba(23, 23, 23, 0.72);
		transition:
			background 180ms ease,
			color 180ms ease,
			border-color 180ms ease,
			transform 180ms ease,
			box-shadow 180ms ease;
	}

	:global(.dark) .theme-preset {
		background:
			radial-gradient(circle at 100% 0, color-mix(in srgb, var(--tone-color) 34%, transparent), transparent 66%),
			rgba(255, 255, 255, 0.04);
		border-color: color-mix(in srgb, var(--tone-color) 18%, rgba(255, 255, 255, 0.08));
		color: rgba(255, 255, 255, 0.72);
	}

	.theme-preset.active {
		color: white;
		background:
			radial-gradient(circle at 100% 0, color-mix(in srgb, var(--tone-color) 50%, transparent), transparent 64%),
			color-mix(in srgb, var(--tone-color) 76%, #202a3a);
		box-shadow: 0 10px 24px color-mix(in srgb, var(--tone-color) 20%, transparent);
	}

	.theme-preset span,
	.theme-preset small {
		display: block;
	}

	.theme-preset span {
		font-size: 0.76rem;
		font-weight: 900;
		line-height: 1.2;
	}

	.theme-preset small {
		margin-top: 0.28rem;
		color: currentColor;
		font-size: 0.62rem;
		font-weight: 850;
		opacity: 0.68;
	}

	.advanced-panel {
		display: grid;
		gap: 0.55rem;
		margin-top: 0.65rem;
	}

	.advanced-control {
		--tone-color: oklch(0.7 0.14 var(--tone-hue));
		display: grid;
		grid-template-columns: 3rem minmax(0, 1fr) 3rem;
		align-items: center;
		gap: 0.42rem;
		padding: 0.42rem;
		border-radius: 0.95rem;
		background:
			radial-gradient(circle at 100% 0, color-mix(in srgb, var(--tone-color) 28%, transparent), transparent 66%),
			rgba(255, 255, 255, 0.58);
		border: 1px solid color-mix(in srgb, var(--tone-color) 18%, rgba(255, 255, 255, 0.72));
	}

	:global(.dark) .advanced-control {
		background:
			radial-gradient(circle at 100% 0, color-mix(in srgb, var(--tone-color) 24%, transparent), transparent 66%),
			rgba(255, 255, 255, 0.04);
		border-color: color-mix(in srgb, var(--tone-color) 18%, rgba(255, 255, 255, 0.08));
	}

	.advanced-step-button,
	.advanced-readout {
		min-height: 2.25rem;
		border-radius: 0.72rem;
		font-size: 0.76rem;
		font-weight: 900;
		line-height: 1;
	}

	.advanced-step-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		color: color-mix(in srgb, var(--primary) 78%, #172033);
		background: color-mix(in srgb, var(--primary) 10%, rgba(255, 255, 255, 0.76));
		border: 1px solid color-mix(in srgb, var(--primary) 14%, transparent);
		transition:
			background 180ms ease,
			color 180ms ease,
			transform 180ms ease;
	}

	.advanced-step-button:hover {
		background: color-mix(in srgb, var(--primary) 16%, rgba(255, 255, 255, 0.78));
	}

	:global(.dark) .advanced-step-button {
		color: color-mix(in srgb, var(--primary) 84%, white);
		background: color-mix(in srgb, var(--primary) 12%, rgba(255, 255, 255, 0.06));
		border-color: color-mix(in srgb, var(--primary) 18%, transparent);
	}

	.advanced-readout {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.32rem;
		color: rgba(23, 23, 23, 0.76);
		background: rgba(255, 255, 255, 0.62);
		border: 1px solid rgba(255, 255, 255, 0.72);
	}

	:global(.dark) .advanced-readout {
		color: rgba(255, 255, 255, 0.82);
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.08);
	}

	.advanced-readout span,
	.advanced-readout strong {
		font-size: 0.82rem;
		font-weight: 900;
		line-height: 1;
		letter-spacing: 0.01em;
		font-variant-numeric: tabular-nums;
	}

	.advanced-readout span {
		opacity: 0.72;
	}

	.advanced-readout strong {
		opacity: 0.96;
	}

	.slider-shell {
		height: 2.1rem;
		border-radius: 0.85rem;
		padding: 0.3rem;
		background: var(--color-selection-bar);
	}

	#display-setting input[type="range"] {
		-webkit-appearance: none;
		width: 100%;
		height: 1.5rem;
		background: transparent;
	}

	#display-setting input[type="range"]::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 0.75rem;
		height: 1.5rem;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
	}

	#display-setting input[type="range"]::-moz-range-thumb {
		width: 0.75rem;
		height: 1.5rem;
		border: 0;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.92);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
	}
</style>
