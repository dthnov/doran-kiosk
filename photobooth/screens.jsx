// Photobooth screens — intro, modes, camera, recall, saved.

const MODES = [
  {
    id: "expression",
    title: "표정 따라하기",
    desc: "도란이의 표정을 함께 지어봐요",
    icon: "sentiment_very_satisfied",
    accent: true,
    prompt: "도란이처럼 환하게 웃어볼까요?",
    expression: "환한 미소",
    choices: ["환한 미소", "찡그린 표정", "놀란 표정", "슬픈 표정"],
    correct: 0,
    recallQ: "방금 어떤 표정을 지으셨나요?",
  },
  {
    id: "today",
    title: "오늘의 나",
    desc: "오늘 날짜와 기분을 기록해요",
    icon: "today",
    prompt: "오늘 하루 기분이 어떠세요?\n사진 한 장 남겨볼까요?",
    expression: "오늘의 기분",
    choices: ["기쁨", "편안함", "그리움", "설렘"],
    correct: null, // any answer is fine
    recallQ: "오늘 기분을 한 단어로 골라주세요",
  },
  {
    id: "family",
    title: "가족과 함께",
    desc: "함께 계신 분의 이름을 떠올려요",
    icon: "groups",
    prompt: "옆에 누가 함께 계신가요?\n같이 사진 찍어볼까요?",
    expression: "가족",
    choices: ["딸 미경", "아들 영호", "손주 지우", "혼자"],
    correct: null,
    recallQ: "함께 계신 분은 누구신가요?",
  },
];

/* ─── Intro ─────────────────────────────────────────────────── */
function IntroScreen({ go, name }) {
  return (
    <div className="screen screen--intro fade-in">
      <Mascot size={86} />
      <Bubble style={{ marginTop: 10 }}>
        {name} 님, 추억 한 장<br/>함께 남겨볼까요?
      </Bubble>
      <p className="intro__hint">기억력 쑥쑥 — 오늘의 포토부스</p>
      <div className="intro__cta">
        <Pill accent icon="photo_camera" onClick={() => go("modes")}>사진 찍기</Pill>
        <Pill icon="chat_bubble" onClick={() => go("chat")}>추억 대화</Pill>
      </div>
    </div>
  );
}

/* ─── Mode select ──────────────────────────────────────────── */
function ModesScreen({ go, setMode }) {
  return (
    <div className="screen screen--modes fade-in">
      <ScreenHead title="오늘은 무엇을 해볼까요?" onBack={() => go("intro")} />
      <div className="modes__list">
        {MODES.map((m, i) => (
          <button
            key={m.id}
            className="mode-card"
            onClick={() => { setMode(m); go("camera"); }}
          >
            <span className={"mode-card__icon" + (m.accent ? " mode-card__icon--accent" : "")}>
              <span className="material-symbols-rounded">{m.icon}</span>
            </span>
            <span className="mode-card__body">
              <span className="mode-card__title">{m.title}</span>
              <span className="mode-card__desc">{m.desc}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Camera + countdown ───────────────────────────────────── */
function CameraScreen({ go, mode, setPhoto, setCamOn }) {
  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const [hasCam, setHasCam] = React.useState(null); // null = unknown, false = denied
  const [count, setCount] = React.useState(null); // null = idle, "ready", 3, 2, 1, "snap"
  const [flash, setFlash] = React.useState(false);

  // Try camera
  React.useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("no api");
        const s = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 640, facingMode: "user" },
          audio: false,
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        setHasCam(true);
        setCamOn(true);
      } catch (e) {
        setHasCam(false);
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCamOn(false);
    };
  }, []);

  // Attach the live stream once the <video> element is on screen.
  React.useEffect(() => {
    if (hasCam === true && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      const p = videoRef.current.play();
      if (p && p.catch) p.catch(() => {});
    }
  }, [hasCam]);

  const capture = React.useCallback(() => {
    // Snap a frame from the video, or use a fallback poster.
    let dataUrl = null;
    try {
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        const v = videoRef.current;
        const c = document.createElement("canvas");
        const size = Math.min(v.videoWidth, v.videoHeight);
        c.width = c.height = size;
        const ctx = c.getContext("2d");
        // Mirror to match preview
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        const sx = (v.videoWidth - size) / 2;
        const sy = (v.videoHeight - size) / 2;
        ctx.drawImage(v, sx, sy, size, size, 0, 0, size, size);
        // warm tint
        ctx.globalCompositeOperation = "soft-light";
        ctx.fillStyle = "rgba(185,121,75,0.18)";
        ctx.fillRect(0, 0, size, size);
        dataUrl = c.toDataURL("image/jpeg", 0.85);
      }
    } catch (e) { /* fallback below */ }

    if (!dataUrl) {
      // Fallback: render the silhouette SVG to a data URL
      const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'>
        <defs><radialGradient id='g' cx='50%' cy='35%' r='70%'>
          <stop offset='0%' stop-color='#5C3A1E'/><stop offset='100%' stop-color='#1B1410'/>
        </radialGradient></defs>
        <rect width='200' height='200' fill='url(%23g)'/>
        <path d='M0,200 C 30,144 60,136 100,136 C 140,136 170,144 200,200 Z' fill='%233a2614'/>
        <circle cx='100' cy='84' r='36' fill='%233a2614'/>
        <circle cx='88' cy='72' r='8' fill='rgba(219,169,136,0.25)'/>
      </svg>`;
      dataUrl = "data:image/svg+xml;utf8," + encodeURIComponent(svg).replace(/'/g, "%27");
    }
    setPhoto(dataUrl);
    setFlash(true);
    setTimeout(() => { go("recall"); }, 520);
  }, [go, setPhoto]);

  const startCountdown = () => {
    if (count !== null) return;
    setCount(3);
    setTimeout(() => setCount(2), 1000);
    setTimeout(() => setCount(1), 2000);
    setTimeout(() => { setCount(null); capture(); }, 3000);
  };

  return (
    <div className="screen screen--camera fade-in">
      <div className="cam-frame">
        {hasCam === true && (
          <video ref={videoRef} className="cam-video" muted playsInline autoPlay />
        )}
        {hasCam === false && (
          <div className="cam-fallback">
            <CameraSilhouette/>
          </div>
        )}
        {hasCam === null && (
          <div className="cam-fallback">
            <span style={{position:"relative", zIndex:1}}>카메라 준비 중…</span>
          </div>
        )}
        <div className="cam-overlay"/>
      </div>

      <div className="cam-prompt">
        <Mascot size={36} />
        <Bubble>{mode.prompt}</Bubble>
      </div>

      <div className="cam-back">
        <Pill onClick={() => go("modes")}>처음으로</Pill>
      </div>

      {count !== null && (
        <div className="countdown">
          <div className="countdown__num" key={count}>{count}</div>
        </div>
      )}
      {flash && <div className="flash" />}

      <div className="cam-shutter">
        <button className="cam-shutter__btn" onClick={startCountdown} aria-label="촬영">
          <span className="material-symbols-rounded">photo_camera</span>
        </button>
        <span className="cam-shutter__hint">버튼을 누르면<br/>3초 뒤에 찰칵!</span>
      </div>
    </div>
  );
}

/* ─── Recall question ──────────────────────────────────────── */
function RecallScreen({ go, mode, photo }) {
  const [pick, setPick] = React.useState(null);
  const [reveal, setReveal] = React.useState(false);

  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`;

  const submit = (i) => {
    setPick(i);
    setReveal(true);
    setTimeout(() => go("saved"), 1400);
  };

  const correct = mode.correct;
  return (
    <div className="screen screen--recall fade-in">
      <div className="recall__photo">
        {photo && <img src={photo} alt="방금 찍은 사진" />}
        <span className="stamp">{stamp}</span>
      </div>
      <div className="recall__col">
        <ScreenHead title="잠깐 떠올려볼까요" onBack={() => go("camera")} progress="2/3" />
        <div className="recall__q">{mode.recallQ}</div>
        <div className="recall__choices">
          {mode.choices.map((c, i) => {
            let cls = "choice";
            if (reveal) {
              if (correct !== null) {
                if (i === correct) cls += " is-correct";
                else if (i === pick) cls += " is-wrong";
              } else if (i === pick) {
                cls += " is-correct";
              } else {
                cls += " is-wrong";
              }
            } else if (pick === i) cls += " is-on";
            return (
              <button key={i} className={cls} disabled={reveal} onClick={() => submit(i)}>
                {c}
              </button>
            );
          })}
        </div>
        {reveal && (
          <div className="recall__feedback">
            <span className="material-symbols-rounded">favorite</span>
            잘 기억하고 계세요
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Saved confirmation ──────────────────────────────────── */
function SavedScreen({ go, mode, photo, name }) {
  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,"0")}.${String(today.getDate()).padStart(2,"0")}`;
  return (
    <div className="screen screen--saved fade-in">
      <div className="polaroid">
        {photo && <img src={photo} alt="저장된 사진" />}
        <div className="polaroid__cap">{name} · {stamp}</div>
      </div>
      <div className="saved__msg">추억 앨범에 담았어요</div>
      <div className="saved__sub">자녀분께도 함께 보내드릴까요?</div>
      <div className="saved__actions">
        <Pill accent icon="chat_bubble" onClick={() => go("chat")}>도란과 대화</Pill>
        <Pill icon="print" onClick={() => go("intro")}>인화</Pill>
      </div>
    </div>
  );
}

/* ─── AI memory conversation ──────────────────────────────── */
const SEED_PROMPTS = [
  "어릴 적 살던 동네 이야기",
  "처음 만난 날의 추억",
  "어머니가 해주시던 음식",
  "가장 즐거웠던 여행",
  "결혼하시던 날",
  "손주 이야기",
];

async function askDoran({ name, log }) {
  const messages = log.map((m) => ({
    role: m.who === "user" ? "user" : "assistant",
    content: m.text,
  }));
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, messages }),
  });
  if (!res.ok) throw new Error("chat failed");
  const data = await res.json();
  return (data.reply ?? "").trim();
}

async function transcribeVoice(blob) {
  const form = new FormData();
  const ext = (blob.type.split("/")[1] ?? "webm").split(";")[0];
  form.append("audio", blob, `voice.${ext}`);
  const res = await fetch("/api/whisper", { method: "POST", body: form });
  if (!res.ok) throw new Error("whisper failed");
  const data = await res.json();
  return (data.text ?? "").trim();
}

async function speakDoran(text, audioRef) {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (audioRef.current) {
      try { audioRef.current.pause(); } catch {}
      audioRef.current.src = url;
      await audioRef.current.play().catch(() => {});
    }
  } catch {
    /* TTS 실패는 조용히 무시 */
  }
}

function pickMimeType() {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (window.MediaRecorder && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

function ChatScreen({ go, name }) {
  const [log, setLog] = React.useState([
    { who: "ai", text: `${name} 님, 오늘은 어떤 추억을 함께 떠올려볼까요?\n편하게 이야기해 주세요.` },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [speaking, setSpeaking] = React.useState(false);
  const [voiceState, setVoiceState] = React.useState(""); // "", "transcribing"
  const logRef = React.useRef(null);
  const audioRef = React.useRef(null);
  const recRef = React.useRef(null);
  const chunksRef = React.useRef([]);
  const streamRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, busy, voiceState]);

  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setSpeaking(true);
    const onEnd = () => setSpeaking(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", onEnd);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("pause", onEnd);
    };
  }, []);

  React.useEffect(() => () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    if (audioRef.current) { try { audioRef.current.pause(); } catch {} }
  }, []);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    const next = [...log, { who: "user", text: msg }];
    setLog(next);
    setBusy(true);
    try {
      const reply = await askDoran({ name, log: next });
      const safe = reply || "잠시 생각이 잘 안 나네요. 다시 한 번 들려주실래요?";
      setLog((l) => [...l, { who: "ai", text: safe }]);
      speakDoran(safe, audioRef);
    } catch (e) {
      setLog((l) => [...l, { who: "ai", text: "잠시 연결이 어려워요. 다시 한번 들려주실래요?" }]);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    if (recording || busy) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      alert("이 브라우저에서는 음성 녹음을 사용할 수 없어요.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickMimeType();
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        setRecording(false);
        if (blob.size < 800) { setVoiceState(""); return; }
        setVoiceState("transcribing");
        try {
          const text = await transcribeVoice(blob);
          setVoiceState("");
          if (text) send(text);
        } catch {
          setVoiceState("");
          setLog((l) => [...l, { who: "ai", text: "음성을 잘 듣지 못했어요. 한 번 더 말씀해 주실래요?" }]);
        }
      };
      recRef.current = rec;
      rec.start();
      setRecording(true);
      if (audioRef.current) { try { audioRef.current.pause(); } catch {} }
    } catch (e) {
      alert("마이크 권한이 필요해요.");
    }
  };

  const stopRecording = () => {
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  };

  const toggleMic = () => (recording ? stopRecording() : startRecording());

  const showSeeds = log.length <= 1 && !busy && !recording && voiceState === "";

  return (
    <div className="screen screen--chat fade-in">
      <ScreenHead title="추억 대화" onBack={() => go("intro")} progress="도란과 함께" />
      <div className="chat__log" ref={logRef}>
        {log.map((m, i) => (
          <div key={i} className={"chat-row " + (m.who === "user" ? "chat-row--user" : "chat-row--ai")}>
            {m.who === "ai" && <Mascot size={24}/>}
            <div className={"chat-bubble " + (m.who === "user" ? "chat-bubble--user" : "chat-bubble--ai") + (speaking && m.who === "ai" && i === log.length - 1 ? " chat-bubble--speaking" : "")}>
              {m.text}
            </div>
          </div>
        ))}
        {(busy || voiceState === "transcribing") && (
          <div className="chat-row chat-row--ai">
            <Mascot size={24}/>
            <div className="chat-bubble chat-bubble--ai chat-bubble--thinking">
              <i/><i/><i/>
            </div>
          </div>
        )}
        {showSeeds && (
          <div className="chat__seeds">
            {SEED_PROMPTS.map((s, i) => (
              <button key={i} className="chat__seed" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
      </div>
      {recording && (
        <div className="chat__voice-hint">
          <span className="chat__voice-dot"/>듣고 있어요… 다 말씀하시면 마이크를 다시 눌러주세요
        </div>
      )}
      <form
        className="chat__compose"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <button
          type="button"
          className={"chat__mic" + (recording ? " is-on" : "")}
          aria-label={recording ? "녹음 중지" : "음성으로 말하기"}
          onClick={toggleMic}
          disabled={busy || voiceState === "transcribing"}
        >
          <span className="material-symbols-rounded">{recording ? "stop" : "mic"}</span>
        </button>
        <input
          className="chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={recording ? "말씀해 주세요…" : "이야기를 들려주세요…"}
          disabled={busy || recording || voiceState === "transcribing"}
        />
        <button type="submit" className="chat__send" disabled={busy || recording || !input.trim()} aria-label="보내기">
          <span className="material-symbols-rounded">arrow_upward</span>
        </button>
      </form>
      <audio ref={audioRef} hidden/>
    </div>
  );
}

Object.assign(window, { MODES, SEED_PROMPTS, IntroScreen, ModesScreen, CameraScreen, RecallScreen, SavedScreen, ChatScreen });
