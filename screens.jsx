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
  recallQ: "방금 어떤 표정을 지으셨나요?"
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
  recallQ: "오늘 기분을 한 단어로 골라주세요"
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
  recallQ: "함께 계신 분은 누구신가요?"
}];


/* ─── Intro ─────────────────────────────────────────────────── */
function IntroScreen({ go, name }) {
  return (
    <div className="screen screen--intro fade-in">
      <Mascot size={86} />
      <Bubble style={{ marginTop: 10 }}>
        {name} 님, 추억 한 장<br />함께 남겨볼까요?
      </Bubble>
      <p className="intro__hint">치매예방 ai 포토부스</p>
      <div className="intro__cta">
        <Pill accent icon="photo_camera" onClick={() => go("modes")}>사진 찍기</Pill>
        <Pill icon="chat_bubble" onClick={() => go("chat")}>추억 대화</Pill>
      </div>
    </div>);

}

/* ─── Mode select ──────────────────────────────────────────── */
function ModesScreen({ go, setMode }) {
  return (
    <div className="screen screen--modes fade-in">
      <ScreenHead title="오늘은 무엇을 해볼까요?" onBack={() => go("intro")} />
      <div className="modes__list">
        {MODES.map((m, i) =>
        <button
          key={m.id}
          className="mode-card"
          onClick={() => {setMode(m);go("camera");}}>
          
            <span className={"mode-card__icon" + (m.accent ? " mode-card__icon--accent" : "")}>
              <span className="material-symbols-rounded">{m.icon}</span>
            </span>
            <span className="mode-card__body">
              <span className="mode-card__title">{m.title}</span>
              <span className="mode-card__desc">{m.desc}</span>
            </span>
          </button>
        )}
      </div>
    </div>);

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
          video: { width: 480, height: 480, facingMode: "user" },
          audio: false
        });
        if (cancelled) {s.getTracks().forEach((t) => t.stop());return;}
        streamRef.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
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
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setCamOn(false);
    };
  }, []);

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
    } catch (e) {/* fallback below */}

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
    setTimeout(() => {go("recall");}, 520);
  }, [go, setPhoto]);

  const startCountdown = () => {
    if (count !== null) return;
    setCount(3);
    setTimeout(() => setCount(2), 1000);
    setTimeout(() => setCount(1), 2000);
    setTimeout(() => {setCount(null);capture();}, 3000);
  };

  return (
    <div className="screen screen--camera fade-in">
      <div className="cam-frame">
        {hasCam === true &&
        <video ref={videoRef} className="cam-video" muted playsInline autoPlay />
        }
        {hasCam === false &&
        <div className="cam-fallback">
            <CameraSilhouette />
          </div>
        }
        {hasCam === null &&
        <div className="cam-fallback">
            <span style={{ position: "relative", zIndex: 1 }}>카메라 준비 중…</span>
          </div>
        }
        <div className="cam-overlay" />
      </div>

      <div className="cam-prompt">
        <Mascot size={36} />
        <Bubble>{mode.prompt}</Bubble>
      </div>

      <div className="cam-back">
        <Pill onClick={() => go("modes")}>처음으로</Pill>
      </div>

      {count !== null &&
      <div className="countdown">
          <div className="countdown__num" key={count}>{count}</div>
        </div>
      }
      {flash && <div className="flash" />}

      <div className="cam-shutter">
        <button className="cam-shutter__btn" onClick={startCountdown} aria-label="촬영">
          <span className="material-symbols-rounded">photo_camera</span>
        </button>
        <span className="cam-shutter__hint">버튼을 누르면<br />3초 뒤에 찰칵!</span>
      </div>
    </div>);

}

/* ─── Recall question ──────────────────────────────────────── */
function RecallScreen({ go, mode, photo }) {
  const [pick, setPick] = React.useState(null);
  const [reveal, setReveal] = React.useState(false);

  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

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
                if (i === correct) cls += " is-correct";else
                if (i === pick) cls += " is-wrong";
              } else if (i === pick) {
                cls += " is-correct";
              } else {
                cls += " is-wrong";
              }
            } else if (pick === i) cls += " is-on";
            return (
              <button key={i} className={cls} disabled={reveal} onClick={() => submit(i)}>
                {c}
              </button>);

          })}
        </div>
        {reveal &&
        <div className="recall__feedback">
            <span className="material-symbols-rounded">favorite</span>
            잘 기억하고 계세요
          </div>
        }
      </div>
    </div>);

}

/* ─── Saved confirmation ──────────────────────────────────── */
function SavedScreen({ go, mode, photo, name }) {
  const today = new Date();
  const stamp = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
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
    </div>);

}

/* ─── AI memory conversation ──────────────────────────────── */
const SEED_PROMPTS = [
"어릴 적 살던 동네 이야기",
"처음 만난 날의 추억",
"어머니가 해주시던 음식",
"가장 즐거웠던 여행",
"결혼하시던 날",
"손주 이야기"];


const CHAT_SYSTEM =
"당신은 어르신과 따뜻하게 대화하는 한국어 추억 회상 도우미 '도란'입니다. " +
"치매 예방을 위한 회상 활동을 돕습니다. 항상 존댓말과 '~님' 호칭을 사용하고, " +
"한 번에 한 가지 짧고 다정한 질문만 합니다(2~3문장, 50자 이내 권장). " +
"어르신의 답변에서 구체적인 단어(장소·인물·음식·계절·감정)를 짚어 다시 부드럽게 되물어 기억을 더 끌어냅니다. " +
"절대 평가하거나 정정하지 않고, '잘 기억하고 계세요' 같은 격려를 자연스럽게 곁들입니다. " +
"이모지·영어는 쓰지 않습니다.";

function ChatScreen({ go, name }) {
  const [log, setLog] = React.useState([
  { who: "ai", text: `${name} 님, 오늘은 어떤 추억을 함께 떠올려볼까요?\n편하게 이야기해 주세요.` }]
  );
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const logRef = React.useRef(null);

  React.useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log, busy]);

  const send = async (text) => {
    const msg = (text ?? input).trim();
    if (!msg || busy) return;
    setInput("");
    const next = [...log, { who: "user", text: msg }];
    setLog(next);
    setBusy(true);
    try {
      const messages = [
      { role: "user", content: CHAT_SYSTEM + "\n\n사용자 이름: " + name },
      { role: "assistant", content: "네, 따뜻하게 도와드릴게요." },
      ...next.map((m) => ({
        role: m.who === "user" ? "user" : "assistant",
        content: m.text
      }))];

      const reply = await window.claude.complete({ messages });
      setLog((l) => [...l, { who: "ai", text: reply.trim() }]);
    } catch (e) {
      setLog((l) => [...l, { who: "ai", text: "잠시 연결이 어려워요. 다시 한번 들려주실래요?" }]);
    } finally {
      setBusy(false);
    }
  };

  const showSeeds = log.length <= 1;

  return (
    <div className="screen screen--chat fade-in">
      <ScreenHead title="추억 대화" onBack={() => go("intro")} progress="도란과 함께" />
      <div className="chat__log" ref={logRef}>
        {log.map((m, i) =>
        <div key={i} className={"chat-row " + (m.who === "user" ? "chat-row--user" : "chat-row--ai")}>
            {m.who === "ai" && <Mascot size={24} />}
            <div className={"chat-bubble " + (m.who === "user" ? "chat-bubble--user" : "chat-bubble--ai")}>
              {m.text}
            </div>
          </div>
        )}
        {busy &&
        <div className="chat-row chat-row--ai">
            <Mascot size={24} />
            <div className="chat-bubble chat-bubble--ai chat-bubble--thinking">
              <i /><i /><i />
            </div>
          </div>
        }
        {showSeeds && !busy &&
        <div className="chat__seeds">
            {SEED_PROMPTS.map((s, i) =>
          <button key={i} className="chat__seed" onClick={() => send(s)}>{s}</button>
          )}
          </div>
        }
      </div>
      <form
        className="chat__compose"
        onSubmit={(e) => {e.preventDefault();send();}}>
        
        <button type="button" className="chat__mic" aria-label="음성">
          <span className="material-symbols-rounded">mic</span>
        </button>
        <input
          className="chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="이야기를 들려주세요…"
          disabled={busy} />
        
        <button type="submit" className="chat__send" disabled={busy || !input.trim()} aria-label="보내기">
          <span className="material-symbols-rounded">arrow_upward</span>
        </button>
      </form>
    </div>);

}

Object.assign(window, { MODES, SEED_PROMPTS, IntroScreen, ModesScreen, CameraScreen, RecallScreen, SavedScreen, ChatScreen });