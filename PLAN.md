# VoiceApp — Windows 11 Voice Dictation Application Plan

## 1. Product Overview

**VoiceApp** is a Windows 11 desktop application that acts as a **voice-powered virtual keyboard**. It captures speech from the microphone, transcribes it in real-time using a top-tier AI speech-to-text model, and injects the resulting text into **any focused application** on the operating system — behaving exactly like keyboard input.

### Core User Flow

```
User presses F10 (or clicks mic button)
  → App starts capturing microphone audio
  → Audio streams to AI transcription engine
  → Transcribed text is injected as keystrokes into the focused app
  → Dynamic sound wave animation plays while user speaks
User presses F12 (or clicks stop button)
  → Dictation stops
  → System tray icon updates to "Deactivated"
```

---

## 2. Technology Stack

### 2.1 Desktop Framework: **Tauri 2.x**

| Aspect | Details |
|---|---|
| **Why Tauri** | ~10x smaller binary than Electron (~3 MB vs 80+ MB). Uses native WebView2 (already bundled in Win11). Rust backend enables direct access to Windows APIs. |
| **Frontend** | React 19 + TypeScript + Vite |
| **Backend** | Rust (Tauri commands + native Windows API access) |
| **System Tray** | Built-in `tray-icon` plugin |
| **Global Hotkeys** | `tauri-plugin-global-shortcut` for F10/F12 |
| **Keystroke Injection** | Rust `enigo` crate (uses Windows `SendInput` API under the hood) |

### 2.2 Frontend UI: **React 19 + TypeScript + Vite + Tailwind CSS 4**

| Library | Purpose |
|---|---|
| **React 19** | UI framework with hooks for state management |
| **TypeScript 5.x** | Type safety across the entire frontend |
| **Vite 6** | Ultra-fast dev server and build tool |
| **Tailwind CSS 4** | Utility-first styling for the compact dictation UI |
| **Motion (Framer Motion)** | Sound wave animation, button transitions, micro-interactions |

### 2.3 Voice Recognition AI: **Deepgram Nova-3** (Primary) + **OpenAI gpt-4o-mini-transcribe** (Fallback)

| Feature | Deepgram Nova-3 | gpt-4o-mini-transcribe (Fallback) |
|---|---|---|
| **Real-time streaming** | Native WebSocket streaming | Chunked HTTP streaming |
| **Latency** | Sub-300ms | ~500ms |
| **English accuracy** | ~95%+ | ~97%+ |
| **Spanish support** | Yes (30+ languages) | Yes (99+ languages) |
| **Auto language detection** | Yes | Yes |
| **Pricing** | $0.0077/min streaming | $0.006/min |
| **Why chosen** | Lowest latency for real-time dictation — critical for a virtual keyboard UX. Native WebSocket streaming means text appears as you speak, not after. | Higher accuracy for complex/noisy audio. Serves as fallback if Deepgram is unavailable. |

**Automatic Language Detection**: Deepgram Nova-3 supports automatic language detection between English (US) and Spanish. We configure `detect_language=true` with `language` hints for `en-US` and `es-CO` to bias detection toward the two target locales.

### 2.4 Audio Capture: **Web Audio API + MediaRecorder**

The browser-native Web Audio API (available in WebView2) captures microphone audio, provides `AnalyserNode` data for the sound wave visualization, and streams PCM audio to the transcription backend.

### 2.5 Keystroke Injection: **Rust `enigo` Crate**

The `enigo` crate provides cross-platform input simulation. On Windows, it wraps the native `SendInput` API. When transcribed text arrives, the Tauri Rust backend calls `enigo.text("transcribed text")` to type it into whatever application currently has focus.

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         VoiceApp (Tauri 2)                         │
│                                                                     │
│  ┌────────────────────────── Frontend ──────────────────────────┐   │
│  │  React 19 + TypeScript + Vite + Tailwind CSS 4               │   │
│  │                                                               │   │
│  │  ┌──────────┐  ┌────────────────┐  ┌──────────────────────┐  │   │
│  │  │  Mic     │  │  Sound Wave    │  │  Status Indicator    │  │   │
│  │  │  Button  │  │  Animation     │  │  (Active/Inactive)   │  │   │
│  │  │  (Start/ │  │  (Motion +     │  │                      │  │   │
│  │  │   Stop)  │  │   Web Audio    │  │                      │  │   │
│  │  │          │  │   AnalyserNode)│  │                      │  │   │
│  │  └────┬─────┘  └───────┬────────┘  └──────────────────────┘  │   │
│  │       │                │                                      │   │
│  │  ┌────▼────────────────▼─────────────────────────────────┐   │   │
│  │  │            Audio Capture Service                       │   │   │
│  │  │  (Web Audio API + MediaStream → PCM chunks)            │   │   │
│  │  └───────────────────────┬────────────────────────────────┘   │   │
│  └──────────────────────────┼────────────────────────────────────┘   │
│                             │ invoke("stream_audio")                 │
│  ┌──────────────────────────▼────────────────────────────────────┐   │
│  │                    Tauri Rust Backend                          │   │
│  │                                                                │   │
│  │  ┌─────────────────┐  ┌──────────────┐  ┌─────────────────┐  │   │
│  │  │ Deepgram WS     │  │ enigo        │  │ System Tray     │  │   │
│  │  │ Client          │  │ (SendInput)  │  │ Manager         │  │   │
│  │  │ (nova-3         │  │              │  │ (tray-icon)     │  │   │
│  │  │  streaming)     │  │ Types text   │  │                 │  │   │
│  │  │                 │  │ into focused  │  │ Shows status:   │  │   │
│  │  │ auto language   │  │ application   │  │ Active/Inactive │  │   │
│  │  │ detection       │  │              │  │                 │  │   │
│  │  └────────┬────────┘  └──────▲───────┘  └─────────────────┘  │   │
│  │           │                  │                                 │   │
│  │           │  transcribed     │  enigo.text(transcript)        │   │
│  │           │  text            │                                 │   │
│  │           └──────────────────┘                                 │   │
│  │                                                                │   │
│  │  ┌──────────────────────────────────────────────────────────┐ │   │
│  │  │  Global Shortcut Handler                                  │ │   │
│  │  │  F10 → Start Dictation    F12 → Stop Dictation            │ │   │
│  │  │  (tauri-plugin-global-shortcut)                           │ │   │
│  │  └──────────────────────────────────────────────────────────┘ │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Any Focused Windows App     │
              │   (Notepad, Word, Browser...) │
              │   Receives keystrokes via     │
              │   Windows SendInput API       │
              └───────────────────────────────┘
```

---

## 4. Project Structure

```
VoiceApp/
├── PLAN.md                              # This document
├── research/
│   └── web-technologies-2026.md         # Technology research
│
├── src-tauri/                           # Rust backend (Tauri)
│   ├── Cargo.toml                       # Rust dependencies
│   ├── tauri.conf.json                  # Tauri configuration
│   ├── capabilities/                    # Tauri 2 permission capabilities
│   │   └── default.json
│   ├── icons/                           # App icons (tray + window)
│   │   ├── icon.ico
│   │   ├── mic-active.ico
│   │   └── mic-inactive.ico
│   └── src/
│       ├── main.rs                      # Entry point, Tauri builder setup
│       ├── lib.rs                       # Module declarations
│       ├── commands/                    # Tauri IPC commands
│       │   ├── mod.rs
│       │   ├── dictation.rs             # Start/stop dictation commands
│       │   └── settings.rs             # App settings commands
│       ├── transcription/               # Speech-to-text integration
│       │   ├── mod.rs
│       │   ├── deepgram.rs              # Deepgram Nova-3 WebSocket client
│       │   └── openai_fallback.rs       # OpenAI gpt-4o-mini-transcribe fallback
│       ├── input/                       # Keystroke injection
│       │   ├── mod.rs
│       │   └── keyboard.rs             # enigo-based SendInput wrapper
│       ├── tray/                        # System tray management
│       │   ├── mod.rs
│       │   └── tray_manager.rs          # Tray icon + menu + status updates
│       ├── hotkeys/                     # Global hotkey registration
│       │   ├── mod.rs
│       │   └── shortcuts.rs            # F10/F12 handlers
│       └── state.rs                    # Shared app state (Arc<Mutex<AppState>>)
│
├── src/                                 # React frontend
│   ├── index.html                       # Entry HTML
│   ├── main.tsx                         # React entry point
│   ├── App.tsx                          # Root component
│   ├── assets/
│   │   └── icons/                       # SVG icons (mic, stop, etc.)
│   ├── components/
│   │   ├── MicButton.tsx               # Rounded mic/stop toggle button
│   │   ├── SoundWaveAnimation.tsx      # Dynamic sound wave visualizer
│   │   ├── StatusIndicator.tsx         # Active/Inactive status display
│   │   └── LanguageIndicator.tsx       # Shows detected language (EN-US / ES-CO)
│   ├── hooks/
│   │   ├── useAudioCapture.ts          # Microphone capture + AnalyserNode
│   │   ├── useDictation.ts            # Dictation start/stop lifecycle
│   │   └── useTauriEvents.ts          # Listen to Tauri backend events
│   ├── services/
│   │   ├── audioService.ts            # Web Audio API setup + PCM streaming
│   │   └── tauriCommands.ts           # Typed wrappers for Tauri invoke()
│   ├── stores/
│   │   └── dictationStore.ts          # Zustand store for app state
│   └── styles/
│       └── globals.css                 # Tailwind imports + custom styles
│
├── package.json                         # Frontend dependencies
├── tsconfig.json                        # TypeScript configuration
├── vite.config.ts                       # Vite configuration
├── tailwind.config.ts                   # Tailwind CSS configuration
└── postcss.config.js                    # PostCSS for Tailwind
```

---

## 5. Detailed Component Design

### 5.1 Mic Button (`MicButton.tsx`)

**Visual Design:**
- **Inactive state**: Rounded circular button (64px diameter) with a microphone SVG icon, soft shadow, subtle gradient background (blue-to-indigo).
- **Active state**: Same button transforms to show a stop icon (square), background pulses red, border glows with a red ring animation.
- **Transitions**: Motion (Framer Motion) handles scale-on-hover (`whileHover`), press feedback (`whileTap`), and the icon crossfade between mic ↔ stop.

```tsx
// Pseudocode
<motion.button
  onClick={toggleDictation}
  className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
             shadow-lg flex items-center justify-center"
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.95 }}
  animate={isActive ? { backgroundColor: "#EF4444" } : {}}
>
  <AnimatePresence mode="wait">
    {isActive ? <StopIcon key="stop" /> : <MicIcon key="mic" />}
  </AnimatePresence>
</motion.button>
```

### 5.2 Sound Wave Animation (`SoundWaveAnimation.tsx`)

**Implementation approach:**
1. **Web Audio API `AnalyserNode`** reads real-time frequency data from the microphone stream.
2. **N vertical bars** (e.g., 5–7 bars) are rendered, each bar's height mapped to a frequency bin's amplitude.
3. **Motion** animates bar heights smoothly with spring physics.
4. When dictation is inactive, bars rest at minimum height. When active, they dance with the user's voice.

```tsx
// Pseudocode
const SoundWaveAnimation = ({ analyserNode, isActive }) => {
  const [levels, setLevels] = useState(new Array(7).fill(4));

  useEffect(() => {
    if (!isActive || !analyserNode) return;
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
    const tick = () => {
      analyserNode.getByteFrequencyData(dataArray);
      // Sample 7 evenly-spaced frequency bins
      const newLevels = sampleBins(dataArray, 7);
      setLevels(newLevels);
      animationFrame = requestAnimationFrame(tick);
    };
    let animationFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrame);
  }, [isActive, analyserNode]);

  return (
    <div className="flex items-center gap-1 h-12">
      {levels.map((level, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-blue-400"
          animate={{ height: isActive ? level : 4 }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        />
      ))}
    </div>
  );
};
```

### 5.3 System Tray (`tray_manager.rs`)

**Behavior:**
- **Inactive**: Gray microphone icon, tooltip "VoiceApp — Deactivated", menu: [Activate | Settings | Quit].
- **Active**: Green/red pulsing microphone icon, tooltip "VoiceApp — Active (EN-US)" or "VoiceApp — Active (ES-CO)", menu: [Deactivate | Settings | Quit].
- Clicking the tray icon toggles the floating dictation window visibility.
- The tray icon updates on every state change via Tauri events.

```rust
// Pseudocode
fn update_tray_status(app: &AppHandle, is_active: bool, language: &str) {
    let icon = if is_active { "mic-active.ico" } else { "mic-inactive.ico" };
    let tooltip = if is_active {
        format!("VoiceApp — Active ({})", language)
    } else {
        "VoiceApp — Deactivated".to_string()
    };
    app.tray_by_id("main")
        .unwrap()
        .set_icon(Some(Icon::File(icon.into())))
        .set_tooltip(Some(&tooltip));
}
```

### 5.4 Global Hotkeys (`shortcuts.rs`)

| Key | Action |
|---|---|
| **F10** | Start dictation (if not already active) |
| **F12** | Stop dictation (if currently active) |

```rust
// Pseudocode
app.plugin(
    tauri_plugin_global_shortcut::Builder::new()
        .with_handler(move |app, shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if shortcut == &Shortcut::new(None, Code::F10) {
                    start_dictation(app);
                } else if shortcut == &Shortcut::new(None, Code::F12) {
                    stop_dictation(app);
                }
            }
        })
        .build(),
)?;
```

### 5.5 Deepgram WebSocket Streaming (`deepgram.rs`)

**Connection flow:**
1. Open WebSocket to `wss://api.deepgram.com/v1/listen`
2. Query params: `model=nova-3`, `detect_language=true`, `punctuate=true`, `smart_format=true`, `encoding=linear16`, `sample_rate=16000`
3. Stream raw PCM audio chunks from the frontend via Tauri events
4. Receive JSON transcription results (interim + final)
5. On final results, call `enigo.text()` to type into the focused app
6. Emit language detection results back to frontend for UI display

```rust
// Pseudocode
async fn connect_deepgram(api_key: &str) -> Result<WebSocketStream> {
    let url = format!(
        "wss://api.deepgram.com/v1/listen?\
         model=nova-3&\
         detect_language=true&\
         punctuate=true&\
         smart_format=true&\
         encoding=linear16&\
         sample_rate=16000"
    );
    let (ws_stream, _) = connect_async(
        Request::builder()
            .uri(&url)
            .header("Authorization", format!("Token {}", api_key))
            .body(())?
    ).await?;
    Ok(ws_stream)
}
```

### 5.6 Keystroke Injection (`keyboard.rs`)

```rust
use enigo::{Enigo, Keyboard, Settings};

pub struct KeyboardInjector {
    enigo: Enigo,
}

impl KeyboardInjector {
    pub fn new() -> Self {
        Self {
            enigo: Enigo::new(&Settings::default()).unwrap(),
        }
    }

    /// Types the transcribed text into the currently focused application.
    /// Uses Windows SendInput API under the hood.
    pub fn type_text(&mut self, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.enigo.text(text)?;
        Ok(())
    }
}
```

---

## 6. Data Flow: End-to-End Dictation Cycle

```
Step 1: User presses F10 (or clicks mic button)
        ↓
Step 2: Frontend requests microphone permission (getUserMedia)
        ↓
Step 3: Web Audio API creates AudioContext + AnalyserNode
        → AnalyserNode feeds frequency data to SoundWaveAnimation
        → MediaStream is connected to a ScriptProcessorNode / AudioWorklet
        ↓
Step 4: PCM audio chunks (16-bit, 16kHz, mono) sent to Rust backend
        via Tauri invoke("send_audio_chunk", { data: ArrayBuffer })
        ↓
Step 5: Rust backend forwards chunks to Deepgram WebSocket
        ↓
Step 6: Deepgram returns transcription JSON:
        {
          "type": "Results",
          "channel": { "alternatives": [{ "transcript": "hello world" }] },
          "is_final": true,
          "speech_final": true,
          "language": "en"
        }
        ↓
Step 7: On is_final == true:
        → Rust calls enigo.text("hello world") → SendInput to focused app
        → Rust emits "transcription" event to frontend (for optional display)
        → Rust emits "language-detected" event ("en-US" or "es-CO")
        ↓
Step 8: Frontend updates LanguageIndicator + continues animation
        ↓
Step 9: User presses F12 (or clicks stop button)
        → Frontend stops microphone capture
        → Rust closes Deepgram WebSocket
        → System tray updates to "Deactivated"
```

---

## 7. UI/UX Layout

The app window is a **compact, always-on-top floating widget** (not a full window).

```
┌──────────────────────────────────────────────────┐
│                  VoiceApp                     ─ ✕ │
├──────────────────────────────────────────────────┤
│                                                    │
│            ┌─── Sound Wave ───┐                   │
│            │  ▎▎▌▌█▌▌▎▎      │                   │
│            └──────────────────┘                   │
│                                                    │
│              ╭──────────╮                          │
│              │          │                          │
│              │   🎤/⏹   │    ← 64px rounded       │
│              │          │       button             │
│              ╰──────────╯                          │
│                                                    │
│         ┌─────────────────────┐                   │
│         │  🟢 Active · EN-US  │   ← status bar    │
│         └─────────────────────┘                   │
│                                                    │
│    F10: Start  ·  F12: Stop                        │
└──────────────────────────────────────────────────┘
```

**Window properties:**
- Always on top (`always_on_top: true` in `tauri.conf.json`)
- Small fixed size (~280 x 340 px)
- Transparent/borderless option for a floating pill design
- Draggable title bar
- Minimize to system tray on close

---

## 8. Dependencies

### 8.1 Rust (`Cargo.toml`)

```toml
[dependencies]
tauri = { version = "2", features = ["tray-icon"] }
tauri-plugin-global-shortcut = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }
tokio-tungstenite = { version = "0.24", features = ["native-tls"] }
enigo = "0.3"
base64 = "0.22"
url = "2"
log = "0.4"
env_logger = "0.11"
```

### 8.2 Frontend (`package.json`)

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-global-shortcut": "^2.0.0",
    "motion": "^12.0.0",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

---

## 9. Configuration

### 9.1 `tauri.conf.json` (Key Settings)

```json
{
  "productName": "VoiceApp",
  "version": "1.0.0",
  "identifier": "com.voiceapp.dictation",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "VoiceApp",
        "width": 280,
        "height": 340,
        "resizable": false,
        "alwaysOnTop": true,
        "decorations": true,
        "transparent": false
      }
    ],
    "trayIcon": {
      "id": "main",
      "iconPath": "icons/mic-inactive.ico",
      "tooltip": "VoiceApp — Deactivated"
    }
  }
}
```

### 9.2 Environment Variables

```env
DEEPGRAM_API_KEY=your_deepgram_api_key_here
OPENAI_API_KEY=your_openai_api_key_here       # Fallback only
```

API keys should be stored securely — either in the Windows Credential Manager via Tauri's secure storage plugin or in an encrypted local config file. **Never hardcode API keys.**

---

## 10. Implementation Phases

### Phase 1: Project Scaffold (Day 1)
- [ ] Initialize Tauri 2 project with React + TypeScript + Vite
- [ ] Configure Tailwind CSS 4
- [ ] Set up project structure (folders, modules)
- [ ] Create basic window with Tauri configuration
- [ ] Add system tray with static icon

### Phase 2: UI Components (Days 2–3)
- [ ] Build `MicButton` component with mic/stop icon toggle
- [ ] Build `SoundWaveAnimation` with Motion spring animations
- [ ] Build `StatusIndicator` component
- [ ] Build `LanguageIndicator` component
- [ ] Style the compact floating widget layout
- [ ] Add Motion transitions between states

### Phase 3: Audio Capture (Day 4)
- [ ] Implement `useAudioCapture` hook (Web Audio API + MediaStream)
- [ ] Set up `AnalyserNode` for frequency data → sound wave visualization
- [ ] Convert audio to 16-bit PCM, 16kHz, mono
- [ ] Stream PCM chunks to Rust backend via Tauri `invoke()`

### Phase 4: Deepgram Integration (Days 5–6)
- [ ] Implement Deepgram WebSocket client in Rust
- [ ] Configure Nova-3 model with auto language detection
- [ ] Handle interim and final transcription results
- [ ] Parse detected language (en-US vs es-CO)
- [ ] Emit transcription events to frontend
- [ ] Add OpenAI gpt-4o-mini-transcribe fallback path

### Phase 5: Keystroke Injection (Day 7)
- [ ] Integrate `enigo` crate for keystroke simulation
- [ ] Implement `type_text()` command that injects text into focused app
- [ ] Handle special characters and Unicode (Spanish accents: á, é, ñ, ü, etc.)
- [ ] Test injection into Notepad, Word, Chrome, VS Code, etc.
- [ ] Handle edge case: VoiceApp window must lose focus before injecting

### Phase 6: Global Hotkeys + System Tray (Day 8)
- [ ] Register F10 (start) and F12 (stop) global shortcuts
- [ ] Implement tray icon state updates (active/inactive icons)
- [ ] Add tray context menu (Activate, Deactivate, Settings, Quit)
- [ ] Minimize to tray on window close
- [ ] Update tray tooltip with status + detected language

### Phase 7: Polish + Edge Cases (Days 9–10)
- [ ] Handle microphone permission denial gracefully
- [ ] Handle Deepgram connection failures (retry with backoff)
- [ ] Handle network loss during active dictation
- [ ] Add subtle audio feedback (optional beep on start/stop)
- [ ] Test with various Windows apps (Notepad, Word, Excel, browsers, IDEs)
- [ ] Test English (US) and Spanish (Colombia) dictation accuracy
- [ ] Performance optimization (minimize CPU/memory usage when idle)

### Phase 8: Build + Distribution (Day 11)
- [ ] Configure Tauri bundler for Windows (.msi / .exe installer)
- [ ] Add app icon and branding
- [ ] Test installer on clean Windows 11 machine
- [ ] Sign the executable (optional, for Windows SmartScreen)
- [ ] Write user-facing README with setup instructions

---

## 11. Key Technical Decisions & Rationale

| Decision | Rationale |
|---|---|
| **Tauri 2 over Electron** | 10x smaller binary, lower memory footprint, Rust backend gives native Windows API access for `SendInput`. WebView2 is pre-installed on Windows 11. |
| **Deepgram Nova-3 over Whisper** | Real-time streaming with sub-300ms latency is critical for a "virtual keyboard" UX. Whisper is batch-oriented and requires custom streaming infrastructure. |
| **`enigo` over direct `SendInput`** | Cross-platform abstraction, handles Unicode correctly, well-maintained. Under the hood it still uses `SendInput` on Windows. |
| **Web Audio API over native audio** | Available in WebView2, provides `AnalyserNode` for free (sound wave viz), no need for Rust audio capture libraries. |
| **Zustand over Redux/Context** | Minimal boilerplate for a small app. Just a few state slices (isActive, language, audioLevel). |
| **Motion (Framer Motion) over CSS** | Spring physics for natural-feeling sound wave bars, `AnimatePresence` for icon crossfade, gesture support for button interactions. |
| **Separate F10/F12 over toggle** | Explicit start/stop avoids ambiguity. User always knows exactly what each key does. No accidental toggling. |

---

## 12. Security Considerations

- **API keys**: Stored in Windows Credential Manager or encrypted local config. Never in source code or plain-text files.
- **Microphone access**: Request permission only when dictation starts. Show clear indicator when mic is active.
- **Audio data**: Streamed directly to Deepgram — never stored locally. No audio recordings saved to disk.
- **SendInput permissions**: VoiceApp runs at normal user privilege. Some apps running as Administrator may not receive injected keystrokes — this is documented as a known limitation.
- **Network**: All API communication over TLS (WSS for Deepgram, HTTPS for OpenAI).

---

## 13. Sources

- [Tauri 2.0 System Tray](https://v2.tauri.app/learn/system-tray/)
- [Tauri 2.0 Global Shortcut Plugin](https://v2.tauri.app/plugin/global-shortcut/)
- [Enigo — Cross-platform input simulation in Rust](https://github.com/enigo-rs/enigo)
- [Deepgram Nova-3 Streaming API](https://deepgram.com/learn/best-speech-to-text-apis)
- [AssemblyAI — Top APIs for Real-Time Speech Recognition 2026](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [Motion (Framer Motion) Documentation](https://motion.dev/docs)
- [Web Audio API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Best Web Dev Tech Stack 2026](https://startelelogic.com/blog/best-technology-stack-for-web-development-2026/)
