<script lang="ts">
import Icon from "@iconify/svelte";
import type { EncryptedPostPayload } from "@utils/encryption";
import { tick } from "svelte";

declare global {
	interface Window {
		initGithubCards?: (root?: ParentNode) => void;
	}
}

export let payload: EncryptedPostPayload;
export let passwordHint = "";

let password = "";
let errorMessage = "";
let unlocked = false;
let isUnlocking = false;
let passwordVisible = false;
let contentElement: HTMLDivElement | null = null;

function fromBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

async function deriveAesKey(inputPassword: string, salt: Uint8Array) {
	const passwordKey = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(inputPassword),
		payload.kdf,
		false,
		["deriveKey"],
	);

	return crypto.subtle.deriveKey(
		{
			name: payload.kdf,
			hash: payload.hash,
			salt,
			iterations: payload.iterations,
		},
		passwordKey,
		{ name: payload.algorithm, length: 256 },
		false,
		["decrypt"],
	);
}

async function unlock() {
	errorMessage = "";
	if (!password) {
		errorMessage = "请输入文章密码。";
		return;
	}

	if (!window.crypto?.subtle) {
		errorMessage = "当前浏览器不支持解锁此文章。";
		return;
	}

	isUnlocking = true;
	try {
		const salt = fromBase64(payload.salt);
		const iv = fromBase64(payload.iv);
		const ciphertext = fromBase64(payload.ciphertext);
		const key = await deriveAesKey(password, salt);
		const decrypted = await crypto.subtle.decrypt(
			{ name: payload.algorithm, iv },
			key,
			ciphertext,
		);

		if (contentElement) {
			contentElement.innerHTML = new TextDecoder().decode(decrypted);
			unlocked = true;
			password = "";
			await tick();
			window.initGithubCards?.(contentElement);
			document.dispatchEvent(
				new CustomEvent("encrypted-post-unlocked", {
					detail: { root: contentElement },
				}),
			);
		}
	} catch {
		errorMessage = "密码不正确，或文章内容无法解密。";
	} finally {
		isUnlocking = false;
	}
}

function copyCode(event: MouseEvent) {
	const target = event.target as Element | null;
	if (!target?.classList.contains("copy-btn")) return;

	const preElement = target.closest("pre");
	const codeElement = preElement?.querySelector("code");
	const code = Array.from(
		codeElement?.querySelectorAll(".code:not(summary *)") ?? [],
	)
		.map((element) => element.textContent)
		.map((text) => (text === "\n" ? "" : text))
		.join("\n");

	navigator.clipboard.writeText(code);

	const timeoutId = target.getAttribute("data-timeout-id");
	if (timeoutId) {
		clearTimeout(Number.parseInt(timeoutId, 10));
	}

	target.classList.add("success");
	const newTimeoutId = window.setTimeout(() => {
		target.classList.remove("success");
	}, 1000);
	target.setAttribute("data-timeout-id", newTimeoutId.toString());
}
</script>

{#if !unlocked}
	<section
		class="mb-6 overflow-hidden rounded-[var(--radius-large)] border border-[var(--line-divider)] bg-[var(--card-bg)] shadow-sm transition dark:shadow-none"
		aria-labelledby="encrypted-post-title"
	>
		<div class="relative border-b border-dashed border-[var(--line-divider)] px-5 py-5 sm:px-6">
			<div class="absolute inset-y-4 left-0 w-1 rounded-r-md bg-[var(--primary)]"></div>
				<div class="flex items-start gap-4">
					<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)]">
					<Icon
						icon="material-symbols:key-outline-rounded"
						class="text-[1.65rem] text-[var(--primary)]"
					/>
				</div>
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2
							id="encrypted-post-title"
							class="m-0 text-lg font-bold leading-7 text-black/85 dark:text-white/85"
						>
							正文已加密
						</h2>
					</div>
					<p class="mt-1 text-sm leading-6 text-black/55 dark:text-white/55">
						请输入密码继续阅读。
					</p>
				</div>
			</div>
		</div>

		<div class="px-5 py-5 sm:px-6">
			{#if passwordHint}
				<div class="mb-4 flex items-start gap-2 rounded-lg border border-[var(--line-divider)] bg-black/[0.025] px-3 py-2.5 text-sm text-black/60 dark:bg-white/[0.035] dark:text-white/60">
					<Icon
						icon="material-symbols:lightbulb-outline-rounded"
						class="mt-0.5 shrink-0 text-lg text-[var(--primary)]"
					/>
					<div class="min-w-0">
						<span class="font-medium text-black/70 dark:text-white/70">提示：</span>
						<span class="break-words">{passwordHint}</span>
					</div>
				</div>
			{/if}

			<form
				class="flex flex-col gap-3 sm:flex-row"
				onsubmit={(event) => {
					event.preventDefault();
					unlock();
				}}
			>
				<label class="sr-only" for="encrypted-post-password">文章密码</label>
				<div class="relative min-w-0 flex-1">
					<Icon
						icon="material-symbols:key-outline-rounded"
						class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xl text-black/35 dark:text-white/35"
					/>
					<input
						id="encrypted-post-password"
						class={`h-12 w-full rounded-lg border bg-[var(--card-bg)] py-0 pl-10 pr-12 text-sm text-black/80 outline-none transition placeholder:text-black/35 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 dark:text-white/80 dark:placeholder:text-white/35 ${
							errorMessage ? "border-red-400/70" : "border-[var(--line-divider)]"
						}`}
						type={passwordVisible ? "text" : "password"}
						bind:value={password}
						placeholder="输入文章密码"
						autocomplete="current-password"
						aria-invalid={errorMessage ? "true" : "false"}
						aria-describedby={errorMessage ? "encrypted-post-error" : undefined}
					/>
					<button
						class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-black/45 transition hover:bg-black/5 hover:text-[var(--primary)] active:scale-95 dark:text-white/45 dark:hover:bg-white/10"
						type="button"
						aria-label={passwordVisible ? "隐藏密码" : "显示密码"}
						onclick={() => {
							passwordVisible = !passwordVisible;
						}}
					>
						<Icon
							icon={passwordVisible
								? "material-symbols:visibility-off-outline-rounded"
								: "material-symbols:visibility-outline-rounded"}
							class="text-xl"
						/>
					</button>
				</div>

				<button
					class="btn-card h-12 w-full cursor-pointer justify-center rounded-lg px-5 text-sm font-semibold active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-28"
					type="submit"
					disabled={isUnlocking}
				>
					<span class="flex items-center gap-2">
						{#if isUnlocking}
							<Icon
								icon="material-symbols:progress-activity-rounded"
								class="text-lg motion-safe:animate-spin"
							/>
							解锁中
						{:else}
							<Icon icon="material-symbols:lock-open-outline-rounded" class="text-lg" />
							解锁
						{/if}
					</span>
				</button>
			</form>

			<div class="mt-3 min-h-6" aria-live="polite">
				{#if errorMessage}
					<div
						id="encrypted-post-error"
						class="flex items-start gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm leading-5 text-red-600 dark:text-red-300"
					>
						<Icon
							icon="material-symbols:error-outline-rounded"
							class="mt-0.5 shrink-0 text-lg"
						/>
						<span>{errorMessage}</span>
					</div>
				{/if}
			</div>
		</div>
	</section>
{/if}

<div
	bind:this={contentElement}
	data-encrypted-post-content
	class:hidden={!unlocked}
	class="prose dark:prose-invert prose-base !max-w-none custom-md mb-6 markdown-content onload-animation"
	onclick={copyCode}
></div>
