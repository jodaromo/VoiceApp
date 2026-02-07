import { invoke } from "@tauri-apps/api/core";

/** Start the dictation session on the Rust backend */
export async function startDictation(): Promise<void> {
  return invoke("start_dictation");
}

/** Stop the dictation session */
export async function stopDictation(): Promise<void> {
  return invoke("stop_dictation");
}

/** Send a PCM audio chunk to the Rust backend for streaming to Deepgram */
export async function sendAudioChunk(chunk: number[]): Promise<void> {
  return invoke("send_audio_chunk", { chunk });
}

/** Set the Deepgram API key */
export async function setApiKey(apiKey: string): Promise<void> {
  return invoke("set_api_key", { apiKey });
}

/** Get current dictation status */
export async function getStatus(): Promise<string> {
  return invoke("get_status");
}
