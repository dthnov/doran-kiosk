import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ── Load Incheon welfare data so 도란 can answer about it ── */
function buildIncheonReference() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, "photobooth", "incheon-data.json"), "utf-8");
    const d = JSON.parse(raw);
    const lines = ["[인천 노인복지 정보 — 어르신이 시설·정책을 물으면 아래에서 정확히 안내]"];
    lines.push("상담전화: " + d.helplines.map((h) => `${h.name} ${h.tel}`).join(", "));
    for (const g of d.districts) {
      const c = g.dementiaCenter;
      const w = g.seniorWelfare.map((f) => `${f.name}(${f.tel})`).join(", ");
      lines.push(`${g.name}: 치매안심센터 ${c.name} ${c.tel} ${c.addr} / 노인복지관 ${w}`);
    }
    lines.push("복지정책: " + d.policies.map((p) => `${p.title}(대상 ${p.who})`).join(", "));
    return lines.join("\n");
  } catch (e) {
    console.warn("[incheon] 데이터를 불러오지 못했어요:", e?.message ?? e);
    return "";
  }
}
const INCHEON_REFERENCE = buildIncheonReference();

const {
  OPENAI_API_KEY,
  CHAT_MODEL = "gpt-4o-mini",
  WHISPER_MODEL = "whisper-1",
  TTS_MODEL = "tts-1",
  TTS_VOICE = "nova",
  PORT = 3000,
} = process.env;

if (!OPENAI_API_KEY || OPENAI_API_KEY.includes("여기에") || !OPENAI_API_KEY.startsWith("sk-")) {
  console.error("\n[도란] OPENAI_API_KEY 가 아직 설정되지 않았어요.");
  console.error("       1) C:\\Users\\doho3\\Downloads\\app2\\.env 파일을 메모장으로 여세요");
  console.error("       2) OPENAI_API_KEY=sk-... 줄에 본인 키를 붙여넣고 저장하세요");
  console.error("       3) 다시 npm start 를 실행하세요\n");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const app = express();
app.use(express.json({ limit: "1mb" }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

const SYSTEM_PROMPT =
  "당신은 어르신과 따뜻하게 대화하는 한국어 추억 회상 도우미 '도란'입니다. " +
  "치매 예방을 위한 회상 활동을 돕습니다. 항상 존댓말과 '~님' 호칭을 사용하고, " +
  "한 번에 한 가지 짧고 다정한 질문만 합니다(2~3문장, 50자 이내 권장). " +
  "어르신의 답변에서 구체적인 단어(장소·인물·음식·계절·감정)를 짚어 부드럽게 되물어 기억을 더 끌어냅니다. " +
  "절대 평가하거나 정정하지 않고, '잘 기억하고 계세요' 같은 격려를 자연스럽게 곁들입니다. " +
  "이모지·영어·괄호 설명은 쓰지 않고, 마침표·쉼표만 사용하는 입말로 답합니다. " +
  "어르신이 치매안심센터·노인복지관·복지정책·전화번호 등 도움 정보를 물으면, 아래 인천 정보에서 정확한 곳과 번호를 한두 문장으로 짧고 또렷하게 알려드리고, '화면 아래 복지 도움 버튼을 누르시면 더 자세히 볼 수 있어요' 라고 덧붙입니다. 정보에 없는 내용은 지어내지 말고 120번이나 가까운 행정복지센터에 여쭤보시라고 안내합니다." +
  (INCHEON_REFERENCE ? "\n\n" + INCHEON_REFERENCE : "");

app.post("/api/chat", async (req, res) => {
  try {
    const { messages = [], name = "" } = req.body ?? {};
    const system = name ? `${SYSTEM_PROMPT}\n\n사용자 이름: ${name}` : SYSTEM_PROMPT;
    const isGpt5 = /^gpt-5/i.test(CHAT_MODEL);
    const params = {
      model: CHAT_MODEL,
      messages: [{ role: "system", content: system }, ...messages],
    };
    if (isGpt5) {
      // gpt-5 시리즈는 내부 "추론" 토큰을 따로 씁니다.
      // reasoning_effort: "minimal" 로 짧은 대화에 맞게 추론을 끄고,
      // max_completion_tokens 도 넉넉히 둡니다.
      params.max_completion_tokens = 800;
      params.reasoning_effort = "minimal";
    } else {
      params.temperature = 0.7;
      params.max_tokens = 220;
    }
    const completion = await openai.chat.completions.create(params);
    const choice = completion.choices?.[0];
    const reply = choice?.message?.content?.trim() ?? "";
    if (!reply) {
      console.warn("[chat] empty reply. finish_reason=", choice?.finish_reason, "usage=", completion.usage);
    }
    res.json({ reply });
  } catch (err) {
    console.error("[chat]", err?.message ?? err);
    res.status(500).json({ error: "chat_failed" });
  }
});

app.post("/api/whisper", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "no_audio" });
    const ext = (req.file.mimetype.split("/")[1] ?? "webm").split(";")[0];
    const filename = `voice.${ext === "mpeg" ? "mp3" : ext}`;
    const file = await OpenAI.toFile(req.file.buffer, filename, {
      type: req.file.mimetype,
    });
    const result = await openai.audio.transcriptions.create({
      file,
      model: WHISPER_MODEL,
      language: "ko",
    });
    res.json({ text: (result.text ?? "").trim() });
  } catch (err) {
    console.error("[whisper]", err?.message ?? err);
    res.status(500).json({ error: "whisper_failed" });
  }
});

app.post("/api/tts", async (req, res) => {
  try {
    const { text = "" } = req.body ?? {};
    const clean = String(text).trim();
    if (!clean) return res.status(400).json({ error: "no_text" });
    const speech = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice: TTS_VOICE,
      input: clean,
      format: "mp3",
      speed: 0.95,
    });
    const buf = Buffer.from(await speech.arrayBuffer());
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(buf);
  } catch (err) {
    console.error("[tts]", err?.message ?? err);
    res.status(500).json({ error: "tts_failed" });
  }
});

app.use(express.static(path.join(__dirname, "photobooth")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n[도란] http://localhost:${PORT} 에서 키오스크가 열렸어요.`);
  console.log(`       모델: chat=${CHAT_MODEL}, stt=${WHISPER_MODEL}, tts=${TTS_MODEL}/${TTS_VOICE}\n`);
});
