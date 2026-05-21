import { getRandomValues, subtle } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const LOCAL_PASSWORD_FILE = "encrypted-posts.local.json";
const ENV_PASSWORDS = "ENCRYPTED_POST_PASSWORDS";
const PBKDF2_ITERATIONS = 210_000;
const KEY_BITS = 256;

export type EncryptedPostPayload = {
	version: "v1";
	algorithm: "AES-GCM";
	kdf: "PBKDF2";
	hash: "SHA-256";
	iterations: number;
	salt: string;
	iv: string;
	ciphertext: string;
};

type PasswordMap = Record<string, string>;

function parsePasswordMap(source: string, label: string): PasswordMap {
	let parsed: unknown;
	try {
		parsed = JSON.parse(source);
	} catch (error) {
		throw new Error(`${label} is not valid JSON: ${(error as Error).message}`);
	}

	if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
		throw new Error(
			`${label} must be a JSON object that maps post slug to password.`,
		);
	}

	const result: PasswordMap = {};
	for (const [slug, password] of Object.entries(parsed)) {
		if (typeof password !== "string" || password.length === 0) {
			throw new Error(`${label} has an empty or non-string password for "${slug}".`);
		}
		result[slug] = password;
	}
	return result;
}

export function loadEncryptedPostPasswords(): PasswordMap {
	if (existsSync(LOCAL_PASSWORD_FILE)) {
		return parsePasswordMap(
			readFileSync(LOCAL_PASSWORD_FILE, "utf8"),
			LOCAL_PASSWORD_FILE,
		);
	}

	const envValue = process.env[ENV_PASSWORDS];
	if (envValue?.trim()) {
		return parsePasswordMap(envValue, ENV_PASSWORDS);
	}

	return {};
}

export function getEncryptedPostPassword(
	slug: string,
	passwords = loadEncryptedPostPasswords(),
): string {
	const password = passwords[slug];
	if (!password) {
		throw new Error(`Missing encrypted post password for slug "${slug}".`);
	}
	return password;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
	const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
	return Buffer.from(view).toString("base64");
}

async function deriveAesKey(password: string, salt: Uint8Array) {
	const passwordKey = await subtle.importKey(
		"raw",
		new TextEncoder().encode(password),
		"PBKDF2",
		false,
		["deriveKey"],
	);

	return subtle.deriveKey(
		{
			name: "PBKDF2",
			hash: "SHA-256",
			salt: salt.buffer as ArrayBuffer,
			iterations: PBKDF2_ITERATIONS,
		},
		passwordKey,
		{ name: "AES-GCM", length: KEY_BITS },
		false,
		["encrypt"],
	);
}

export async function encryptPostHtml(
	html: string,
	password: string,
): Promise<EncryptedPostPayload> {
	const salt = getRandomValues(new Uint8Array(16));
	const iv = getRandomValues(new Uint8Array(12));
	const key = await deriveAesKey(password, salt);
	const ciphertext = await subtle.encrypt(
		{ name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
		key,
		new TextEncoder().encode(html),
	);

	return {
		version: "v1",
		algorithm: "AES-GCM",
		kdf: "PBKDF2",
		hash: "SHA-256",
		iterations: PBKDF2_ITERATIONS,
		salt: toBase64(salt),
		iv: toBase64(iv),
		ciphertext: toBase64(ciphertext),
	};
}
