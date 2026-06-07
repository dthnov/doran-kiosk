// Photobooth — main app + Tweaks panel.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "name": "주혜",
  "showCameraNotch": true,
  "frameStyle": "polaroid",
  "deviceScale": 820
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = React.useState("intro");
  const [mode, setMode]     = React.useState(MODES[0]);
  const [photo, setPhoto]   = React.useState(null);
  const [camOn, setCamOn]   = React.useState(false);

  let inner;
  if (screen === "intro")        inner = <IntroScreen  go={setScreen} name={t.name} />;
  else if (screen === "modes")   inner = <ModesScreen  go={setScreen} setMode={setMode} />;
  else if (screen === "camera")  inner = <CameraScreen go={setScreen} mode={mode} setPhoto={setPhoto} setCamOn={setCamOn} />;
  else if (screen === "recall")  inner = <RecallScreen go={setScreen} mode={mode} photo={photo} />;
  else if (screen === "saved")   inner = <SavedScreen  go={setScreen} mode={mode} photo={photo} name={t.name} />;
  else if (screen === "chat")    inner = <ChatScreen   go={setScreen} name={t.name} />;
  else if (screen === "welfare") inner = <WelfareScreen go={setScreen} />;

  return (
    <div className="stage">
      <div className="stage__caption">
        <span><b>도란</b> · 치매예방 포토부스</span>
      </div>

      <div className="device-stage" style={{ width: `min(${t.deviceScale}px, 96vw)` }}>
        <div className="device">
          {t.showCameraNotch && <div className={"device__cam" + (camOn ? " is-on" : "")}/>}
          <div className="device__screen">{inner}</div>
        </div>
      </div>

      <PhotoboothTweaks t={t} setT={setTweak}/>
    </div>
  );
}

function PhotoboothTweaks({ t, setT }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="사용자">
        <TweakText label="이름" value={t.name} onChange={(v) => setT("name", v)} />
      </TweakSection>
      <TweakSection label="기기">
        <TweakSlider label="기기 크기" min={620} max={960} step={10}
          value={t.deviceScale} onChange={(v) => setT("deviceScale", v)} unit="px" />
        <TweakToggle label="녹화등 표시" value={t.showCameraNotch}
          onChange={(v) => setT("showCameraNotch", v)} />
      </TweakSection>
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
