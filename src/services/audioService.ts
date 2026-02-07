/**
 * AudioService — Captures microphone audio using Web Audio API,
 * provides an AnalyserNode for visualization, and streams PCM chunks.
 */

export interface AudioServiceHandle {
  analyserNode: AnalyserNode;
  stop: () => void;
}

const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 4096;

/**
 * Starts capturing audio from the microphone.
 *
 * @param onAudioChunk - callback receiving 16-bit PCM audio data as number[]
 * @returns handle with AnalyserNode for visualization and stop() to clean up
 */
export async function startAudioCapture(
  onAudioChunk: (chunk: number[]) => void
): Promise<AudioServiceHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      sampleRate: SAMPLE_RATE,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });

  const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
  const source = audioContext.createMediaStreamSource(stream);

  // AnalyserNode for sound wave visualization
  const analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.7;
  source.connect(analyserNode);

  // ScriptProcessorNode to capture raw PCM data
  // (AudioWorklet would be preferred in production but ScriptProcessor
  //  works reliably in WebView2 and keeps the implementation simpler)
  const processor = audioContext.createScriptProcessor(BUFFER_SIZE, 1, 1);

  processor.onaudioprocess = (event: AudioProcessingEvent) => {
    const inputData = event.inputBuffer.getChannelData(0);

    // Convert Float32 [-1, 1] to Int16 PCM
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const sample = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Convert to number[] for Tauri IPC serialization
    const bytes = new Uint8Array(pcm16.buffer);
    const chunk = Array.from(bytes);
    onAudioChunk(chunk);
  };

  source.connect(processor);
  processor.connect(audioContext.destination);

  const stop = () => {
    processor.disconnect();
    source.disconnect();
    analyserNode.disconnect();
    stream.getTracks().forEach((track) => track.stop());
    audioContext.close();
  };

  return { analyserNode, stop };
}
