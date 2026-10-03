/* tslint:disable */
/* eslint-disable */

export function clear_identity_changes(account_id: string): void;

export function create_sender_key_distribution(account_id: string, local_device_number: number, conversation_id: string): string;

export function decrypt(account_id: string, sender_account_id: string, sender_device_number: number, local_device_number: number, ciphertext_hex: string, is_prekey_message: boolean): string;

export function encrypt(account_id: string, peer_account_id: string, peer_device_number: number, local_device_number: number, plaintext_hex: string): string;

export function establish_session(account_id: string, peer_account_id: string, peer_device_number: number, local_device_number: number, bundle_json: string): void;

/**
 * Generates a fresh symmetric key (32 bytes) and base nonce (4 bytes) for
 * one attachment. Returns JSON: `{"key_hex": "...", "base_nonce_hex": "..."}`.
 */
export function generate_attachment_key(): string;

/**
 * Generates a fresh identity key pair for `account_id`, registers the
 * local registration id, and returns the serialized key pair as hex
 * (65 bytes: 33 public + 32 private).
 */
export function generate_identity(account_id: string, registration_id: number): string;

/**
 * Generates `count` one-time prekeys on X25519 and Kyber, plus a fresh
 * signed prekey and a Kyber last-resort. Stores the private halves.
 * Returns JSON with the public halves, ready to POST to `/devices/me/prekeys`.
 */
export function generate_prekeys(account_id: string, count: number): string;

export function group_decrypt(account_id: string, sender_account_id: string, sender_device_number: number, skm_hex: string): string;

export function group_encrypt(account_id: string, local_device_number: number, conversation_id: string, plaintext_hex: string): string;

/**
 * Returns the pending identity-change entries for `account_id`, as a JSON
 * array. The caller is expected to show them to the user and then call
 * `clear_identity_changes`.
 */
export function identity_changes(account_id: string): string;

/**
 * Restores an identity key pair previously serialized with
 * `generate_identity`, or persisted via `snapshot`.
 */
export function load_identity(account_id: string, blob_hex: string, registration_id: number): void;

/**
 * Returns the local public identity key as hex (33 bytes).
 */
export function local_identity_public(account_id: string): string;

/**
 * Opens one chunk. The sealed bytes must be exactly as stored.
 */
export function open_chunk(key_hex: string, base_hex: string, chunk_index: bigint, sealed: Uint8Array): Uint8Array;

/**
 * Smoke test.
 */
export function ping(): string;

/**
 * Counts of available prekeys for `account_id`. JSON:
 * `{"one_time_available": N, "kyber_one_time_available": N,
 *   "has_signed_prekey": bool, "has_kyber_last_resort": bool}`
 */
export function prekey_counts(account_id: string): string;

export function process_sender_key_distribution(account_id: string, sender_account_id: string, sender_device_number: number, skdm_hex: string): void;

/**
 * Wipes all state for `account_id` and removes its slot.
 */
export function reset(account_id: string): void;

/**
 * Restores state from a blob produced by `snapshot`.
 */
export function restore(account_id: string, blob_json: string): void;

/**
 * Seals one chunk: plaintext + 16-byte Poly1305 tag.
 */
export function seal_chunk(key_hex: string, base_hex: string, chunk_index: bigint, plaintext: Uint8Array): Uint8Array;

/**
 * Serializes the entire state for `account_id` to JSON.
 */
export function snapshot(account_id: string): string;

export function start(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly clear_identity_changes: (a: number, b: number) => void;
    readonly create_sender_key_distribution: (a: number, b: number, c: number, d: number, e: number) => [number, number, number, number];
    readonly decrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number, number, number];
    readonly encrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number, number, number];
    readonly establish_session: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => [number, number];
    readonly generate_attachment_key: () => [number, number, number, number];
    readonly generate_identity: (a: number, b: number, c: number) => [number, number, number, number];
    readonly generate_prekeys: (a: number, b: number, c: number) => [number, number, number, number];
    readonly group_decrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly group_encrypt: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number, number, number];
    readonly identity_changes: (a: number, b: number) => [number, number, number, number];
    readonly load_identity: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly local_identity_public: (a: number, b: number) => [number, number, number, number];
    readonly open_chunk: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number) => [number, number, number, number];
    readonly ping: () => [number, number];
    readonly prekey_counts: (a: number, b: number) => [number, number, number, number];
    readonly process_sender_key_distribution: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
    readonly reset: (a: number, b: number) => void;
    readonly restore: (a: number, b: number, c: number, d: number) => [number, number];
    readonly seal_chunk: (a: number, b: number, c: number, d: number, e: bigint, f: number, g: number) => [number, number, number, number];
    readonly snapshot: (a: number, b: number) => [number, number, number, number];
    readonly start: () => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
