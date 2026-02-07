use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use tokio::sync::{mpsc, oneshot};
use tokio_tungstenite::{connect_async, tungstenite::Message};

/// Transcription result from Deepgram
#[derive(Debug, Clone)]
pub struct TranscriptionResult {
    pub transcript: String,
    pub is_final: bool,
    pub language: Option<String>,
    pub confidence: f64,
}

/// Deepgram JSON response structures
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct DeepgramResponse {
    #[serde(rename = "type")]
    response_type: Option<String>,
    channel: Option<DeepgramChannel>,
    is_final: Option<bool>,
    speech_final: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct DeepgramChannel {
    alternatives: Vec<DeepgramAlternative>,
    detected_language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeepgramAlternative {
    transcript: String,
    confidence: f64,
}

/// Manages the Deepgram WebSocket connection for real-time streaming transcription.
pub struct DeepgramClient {
    api_key: String,
}

impl DeepgramClient {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }

    /// Starts a streaming transcription session.
    ///
    /// - `audio_rx`: receives PCM audio chunks (16-bit, 16kHz, mono) from the frontend
    /// - `result_tx`: sends transcription results back to the caller
    /// - `stop_rx`: signals when to stop the session
    pub async fn start_streaming(
        &self,
        mut audio_rx: mpsc::Receiver<Vec<u8>>,
        result_tx: mpsc::Sender<TranscriptionResult>,
        stop_rx: oneshot::Receiver<()>,
    ) -> Result<(), String> {
        let url = format!(
            "wss://api.deepgram.com/v1/listen?\
             model=nova-3&\
             detect_language=true&\
             punctuate=true&\
             smart_format=true&\
             encoding=linear16&\
             sample_rate=16000&\
             channels=1"
        );

        let request = http::Request::builder()
            .uri(&url)
            .header("Authorization", format!("Token {}", self.api_key))
            .header("Host", "api.deepgram.com")
            .header("Connection", "Upgrade")
            .header("Upgrade", "websocket")
            .header("Sec-WebSocket-Version", "13")
            .header(
                "Sec-WebSocket-Key",
                tokio_tungstenite::tungstenite::handshake::client::generate_key(),
            )
            .body(())
            .map_err(|e| format!("Failed to build request: {}", e))?;

        let (ws_stream, _) = connect_async(request)
            .await
            .map_err(|e| format!("Failed to connect to Deepgram: {}", e))?;

        let (mut ws_sink, mut ws_source) = ws_stream.split();

        log::info!("Connected to Deepgram WebSocket");

        // Task: forward audio chunks to Deepgram
        let send_task = tokio::spawn(async move {
            while let Some(audio_chunk) = audio_rx.recv().await {
                if ws_sink
                    .send(Message::Binary(audio_chunk.into()))
                    .await
                    .is_err()
                {
                    log::error!("Failed to send audio chunk to Deepgram");
                    break;
                }
            }
            // Send close message to Deepgram
            let _ = ws_sink.send(Message::Text(r#"{"type":"CloseStream"}"#.into())).await;
        });

        // Task: receive transcription results from Deepgram
        let recv_task = tokio::spawn(async move {
            while let Some(msg) = ws_source.next().await {
                match msg {
                    Ok(Message::Text(text)) => {
                        if let Ok(response) = serde_json::from_str::<DeepgramResponse>(&text) {
                            if let Some(channel) = response.channel {
                                if let Some(alt) = channel.alternatives.first() {
                                    if !alt.transcript.is_empty() {
                                        let result = TranscriptionResult {
                                            transcript: alt.transcript.clone(),
                                            is_final: response.is_final.unwrap_or(false),
                                            language: channel.detected_language.clone(),
                                            confidence: alt.confidence,
                                        };
                                        if result_tx.send(result).await.is_err() {
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Ok(Message::Close(_)) => {
                        log::info!("Deepgram WebSocket closed");
                        break;
                    }
                    Err(e) => {
                        log::error!("Deepgram WebSocket error: {}", e);
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Wait for stop signal
        let _ = stop_rx.await;
        log::info!("Stop signal received, closing Deepgram connection");

        send_task.abort();
        recv_task.abort();

        Ok(())
    }
}
