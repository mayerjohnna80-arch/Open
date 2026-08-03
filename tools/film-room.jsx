import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Upload, Scissors, Circle, MoveUpRight, Trash2,
  Film, Users, Sparkles, Tag, StickyNote, ChevronRight, X,
  Rewind, FastForward, Eraser, Target, ListVideo, Plus
} from "lucide-react";

// ---- Design tokens --------------------------------------------------------
// Palette drawn from a floodlit night pitch: deep pitch-navy, chalk line white,
// grass, and a sodium-lamp amber signature accent.
const C = {
  pitch: "#0B1F1A",       // deep pitch shadow
  panel: "#10312A",       // raised panel
  panel2: "#0E271F",      // sunken
  line: "#2A5D4E",        // chalk-green line
  grass: "#3FB27F",       // grass highlight
  chalk: "#EDF6F1",       // chalk white text
  mute: "#7FA697",        // muted label
  amber: "#F2A63B",       // sodium-lamp accent (signature)
  amberDim: "#B77A26",
  red: "#E5644E",
};

const TAG_TYPES = [
  { id: "goal", label: "Goal", color: "#F2A63B" },
  { id: "defense", label: "Defense", color: "#5AA9E6" },
  { id: "transition", label: "Transition", color: "#3FB27F" },
  { id: "setpiece", label: "Set piece", color: "#C77DFF" },
  { id: "mistake", label: "Mistake", color: "#E5644E" },
];

const fmt = (s) => {
  if (isNaN(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};
const uid = () => Math.random().toString(36).slice(2, 9);

export default function SoccerFilmRoom() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const [src, setSrc] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(1);

  const [roster, setRoster] = useState([
    { id: uid(), name: "Left Back", num: 3 },
    { id: uid(), name: "Striker", num: 9 },
    { id: uid(), name: "Keeper", num: 1 },
  ]);
  const [clips, setClips] = useState([]);
  const [markIn, setMarkIn] = useState(null);

  const [tool, setTool] = useState(null); // 'spot' | 'arrow' | 'erase'
  const [draws, setDraws] = useState([]); // {id,type,...,frame}
  const [drawing, setDrawing] = useState(null);

  const [filterType, setFilterType] = useState("all");
  const [filterPlayer, setFilterPlayer] = useState("all");
  const [activeClip, setActiveClip] = useState(null);
  const [aiReel, setAiReel] = useState(null); // {player, clips}
  const [tab, setTab] = useState("clips"); // clips | roster | ai

  // ---- video wiring -------------------------------------------------------
  const loadFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setSrc(URL.createObjectURL(f));
  };
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onT = () => setTime(v.currentTime);
    const onL = () => setDur(v.duration);
    v.addEventListener("timeupdate", onT);
    v.addEventListener("loadedmetadata", onL);
    return () => {
      v.removeEventListener("timeupdate", onT);
      v.removeEventListener("loadedmetadata", onL);
    };
  }, [src]);
  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = rate; }, [rate]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };
  const seek = (t) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(dur || 0, t));
    setTime(v.currentTime);
  };
  const nudge = (d) => seek(time + d);

  // ---- clips --------------------------------------------------------------
  const doMarkIn = () => setMarkIn(time);
  const doMarkOut = () => {
    if (markIn == null) return;
    const start = Math.min(markIn, time), end = Math.max(markIn, time);
    if (end - start < 0.3) { setMarkIn(null); return; }
    const clip = {
      id: uid(), start, end, name: `Play ${clips.length + 1}`,
      tags: [], players: [], note: "",
      draws: draws.filter((d) => d.frame >= start && d.frame <= end),
    };
    setClips((c) => [...c, clip]);
    setMarkIn(null);
    setActiveClip(clip.id);
    setTab("clips");
  };

  const updateClip = (id, patch) =>
    setClips((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const delClip = (id) => {
    setClips((cs) => cs.filter((c) => c.id !== id));
    if (activeClip === id) setActiveClip(null);
  };
  const toggleIn = (arr, val) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const playClip = (c) => {
    seek(c.start);
    setActiveClip(c.id);
    const v = videoRef.current;
    if (v) { v.play(); setPlaying(true); }
  };
  // stop clip at its end
  useEffect(() => {
    if (!activeClip) return;
    const c = clips.find((x) => x.id === activeClip);
    if (c && time >= c.end - 0.05 && playing) {
      videoRef.current?.pause();
      setPlaying(false);
    }
  }, [time, activeClip, clips, playing]);

  // ---- telestration drawing ----------------------------------------------
  const relPos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / r.width,
      y: (e.clientY - r.top) / r.height,
    };
  };
  const onDown = (e) => {
    if (!tool || !src) return;
    const p = relPos(e);
    if (tool === "erase") {
      setDraws((d) => d.filter((o) => {
        const dx = o.x - p.x, dy = o.y - p.y;
        return Math.hypot(dx, dy) > 0.06;
      }));
      return;
    }
    setDrawing({ id: uid(), type: tool, x: p.x, y: p.y, x2: p.x, y2: p.y, r: 0, frame: time });
  };
  const onMove = (e) => {
    if (!drawing) return;
    const p = relPos(e);
    if (drawing.type === "spot") {
      const r = Math.hypot(p.x - drawing.x, p.y - drawing.y);
      setDrawing((d) => ({ ...d, r }));
    } else {
      setDrawing((d) => ({ ...d, x2: p.x, y2: p.y }));
    }
  };
  const onUp = () => {
    if (!drawing) return;
    if ((drawing.type === "spot" && drawing.r > 0.01) ||
        (drawing.type === "arrow" && Math.hypot(drawing.x2 - drawing.x, drawing.y2 - drawing.y) > 0.01)) {
      setDraws((d) => [...d, drawing]);
    }
    setDrawing(null);
  };
  const clearDraws = () => setDraws((d) => d.filter((o) => Math.abs(o.frame - time) > 3));

  // draws visible near current frame (within 3s) or all when paused-editing
  const visibleDraws = [...draws, ...(drawing ? [drawing] : [])]
    .filter((d) => Math.abs(d.frame - time) < 3 || d === drawing);

  // ---- AI-assisted features ----------------------------------------------
  // "Follow player": sequences the player's tagged clips into one continuous view.
  const followPlayer = (pid) => {
    const pc = clips
      .filter((c) => c.players.includes(pid))
      .sort((a, b) => a.start - b.start);
    if (!pc.length) { setAiReel({ pid, clips: [], kind: "follow" }); setTab("ai"); return; }
    setAiReel({ pid, clips: pc, kind: "follow" });
    setTab("ai");
    playSequence(pc);
  };
  // "Highlight reel": ranks a player's clips by moment weight.
  const weight = { goal: 5, defense: 3, transition: 2, setpiece: 2, mistake: 1 };
  const buildReel = (pid) => {
    const pc = clips
      .filter((c) => c.players.includes(pid))
      .map((c) => ({ ...c, score: c.tags.reduce((s, t) => s + (weight[t] || 1), 0) }))
      .sort((a, b) => b.score - a.score);
    setAiReel({ pid, clips: pc, kind: "reel" });
    setTab("ai");
  };
  const seqRef = useRef([]);
  const playSequence = (list) => {
    seqRef.current = [...list];
    const step = () => {
      const next = seqRef.current.shift();
      if (!next) return;
      seek(next.start);
      setActiveClip(next.id);
      videoRef.current?.play();
      setPlaying(true);
    };
    step();
  };

  const filtered = clips.filter((c) => {
    const okT = filterType === "all" || c.tags.includes(filterType);
    const okP = filterPlayer === "all" || c.players.includes(filterPlayer);
    return okT && okP;
  });

  const [newName, setNewName] = useState("");
  const [newNum, setNewNum] = useState("");
  const addPlayer = () => {
    if (!newName.trim()) return;
    setRoster((r) => [...r, { id: uid(), name: newName.trim(), num: Number(newNum) || 0 }]);
    setNewName(""); setNewNum("");
  };

  const pName = (id) => roster.find((p) => p.id === id)?.name || "—";
  const pNum = (id) => roster.find((p) => p.id === id)?.num ?? "";

  // ---- render -------------------------------------------------------------
  return (
    <div style={{
      minHeight: "100vh", background: C.pitch, color: C.chalk,
      fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .disp { font-family: 'Barlow Condensed', sans-serif; letter-spacing: .01em; }
        button { font-family: inherit; cursor: pointer; }
        input:focus, button:focus-visible { outline: 2px solid ${C.amber}; outline-offset: 1px; }
        .tbtn { transition: background .15s, color .15s, transform .05s; }
        .tbtn:active { transform: translateY(1px); }
        input[type=range]{ accent-color:${C.amber}; }
        .scroll::-webkit-scrollbar{ width:8px; }
        .scroll::-webkit-scrollbar-thumb{ background:${C.line}; border-radius:8px; }
        @media (prefers-reduced-motion: reduce){ .tbtn{ transition:none; } }
      `}</style>

      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 22px",
        borderBottom: `1px solid ${C.line}`, background: C.panel2,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: C.amber,
          display: "grid", placeItems: "center", color: C.pitch, fontWeight: 800,
        }}>
          <Film size={19} />
        </div>
        <div>
          <div className="disp" style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
            FILM ROOM
          </div>
          <div style={{ fontSize: 11, color: C.mute, letterSpacing: ".14em", textTransform: "uppercase" }}>
            Match breakdown & player reels
          </div>
        </div>
        <label className="tbtn" style={{
          marginLeft: "auto", display: "flex", alignItems: "center", gap: 8,
          background: C.amber, color: C.pitch, padding: "9px 16px", borderRadius: 9,
          fontWeight: 600, fontSize: 14,
        }}>
          <Upload size={16} /> Load footage
          <input type="file" accept="video/*" onChange={loadFile} style={{ display: "none" }} />
        </label>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0, flexWrap: "wrap" }}>
        {/* ---- Left: player + controls ---- */}
        <main style={{ flex: "1 1 560px", minWidth: 0, padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            ref={wrapRef}
            style={{ position: "relative", background: "#000", borderRadius: 14, overflow: "hidden", aspectRatio: "16/9", border: `1px solid ${C.line}` }}
          >
            {src ? (
              <video ref={videoRef} src={src} style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} onClick={togglePlay} />
            ) : (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: C.mute, textAlign: "center", padding: 24 }}>
                <div>
                  <Film size={44} style={{ opacity: .5 }} />
                  <p style={{ marginTop: 10 }}>Load a game video to start breaking down film.</p>
                </div>
              </div>
            )}

            {/* telestration layer */}
            <svg
              ref={canvasRef}
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              viewBox="0 0 100 56.25" preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: tool ? "crosshair" : "default", pointerEvents: tool ? "auto" : "none" }}
            >
              {visibleDraws.map((d) => d.type === "spot" ? (
                <g key={d.id}>
                  <ellipse cx={d.x * 100} cy={d.y * 56.25} rx={d.r * 100} ry={d.r * 56.25}
                    fill={C.amber} fillOpacity="0.16" stroke={C.amber} strokeWidth="0.5" />
                </g>
              ) : (
                <g key={d.id}>
                  <defs>
                    <marker id={`ah${d.id}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
                      <path d="M0,0 L4,2 L0,4 Z" fill={C.amber} />
                    </marker>
                  </defs>
                  <line x1={d.x * 100} y1={d.y * 56.25} x2={d.x2 * 100} y2={d.y2 * 56.25}
                    stroke={C.amber} strokeWidth="0.7" markerEnd={`url(#ah${d.id})`} />
                </g>
              ))}
            </svg>

            {markIn != null && (
              <div style={{ position: "absolute", top: 10, left: 10, background: C.red, color: "#fff", fontSize: 12, padding: "4px 9px", borderRadius: 6, fontWeight: 600 }}>
                ● Marking from {fmt(markIn)}
              </div>
            )}
          </div>

          {/* scrub bar with clip markers */}
          <div>
            <div style={{ position: "relative", height: 26 }}>
              <input type="range" min={0} max={dur || 0} step={0.05} value={time}
                onChange={(e) => seek(Number(e.target.value))}
                style={{ width: "100%", position: "absolute", top: 8, margin: 0 }} />
              {clips.map((c) => (
                <div key={c.id} title={c.name}
                  onClick={() => playClip(c)}
                  style={{
                    position: "absolute", top: 0, height: 6, borderRadius: 3, cursor: "pointer",
                    left: `${(c.start / (dur || 1)) * 100}%`,
                    width: `${Math.max(1, ((c.end - c.start) / (dur || 1)) * 100)}%`,
                    background: c.id === activeClip ? C.amber : C.grass, opacity: .85,
                  }} />
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.mute, marginTop: 2 }}>
              <span>{fmt(time)}</span><span>{fmt(dur)}</span>
            </div>
          </div>

          {/* transport */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Btn onClick={() => nudge(-1 / 30)} title="Frame back"><Rewind size={16} /></Btn>
            <Btn onClick={togglePlay} primary>{playing ? <Pause size={17} /> : <Play size={17} />}</Btn>
            <Btn onClick={() => nudge(1 / 30)} title="Frame fwd"><FastForward size={16} /></Btn>
            <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
              {[0.25, 0.5, 1, 1.5, 2].map((r) => (
                <button key={r} className="tbtn" onClick={() => setRate(r)}
                  style={{
                    padding: "6px 10px", borderRadius: 7, fontSize: 12, fontWeight: 600, border: "none",
                    background: rate === r ? C.amber : C.panel, color: rate === r ? C.pitch : C.mute,
                  }}>{r}×</button>
              ))}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              {markIn == null ? (
                <Btn onClick={doMarkIn} title="Mark clip start"><Scissors size={15} /> Mark in</Btn>
              ) : (
                <Btn onClick={doMarkOut} primary title="Mark clip end"><Scissors size={15} /> Mark out</Btn>
              )}
            </div>
          </div>

          {/* telestration tools */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "10px 12px", background: C.panel2, borderRadius: 10, border: `1px solid ${C.line}` }}>
            <span style={{ fontSize: 12, color: C.mute, textTransform: "uppercase", letterSpacing: ".1em", marginRight: 4 }}>Spotlight</span>
            <ToolBtn active={tool === "spot"} onClick={() => setTool(tool === "spot" ? null : "spot")}><Circle size={15} /> Circle</ToolBtn>
            <ToolBtn active={tool === "arrow"} onClick={() => setTool(tool === "arrow" ? null : "arrow")}><MoveUpRight size={15} /> Arrow</ToolBtn>
            <ToolBtn active={tool === "erase"} onClick={() => setTool(tool === "erase" ? null : "erase")}><Eraser size={15} /> Erase</ToolBtn>
            <button className="tbtn" onClick={clearDraws} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${C.line}`, color: C.mute, padding: "6px 10px", borderRadius: 7, fontSize: 12 }}>
              Clear frame
            </button>
          </div>
        </main>

        {/* ---- Right: workspace ---- */}
        <aside className="scroll" style={{ flex: "1 1 380px", minWidth: 320, borderLeft: `1px solid ${C.line}`, background: C.panel2, maxHeight: "calc(100vh - 66px)", overflowY: "auto" }}>
          {/* tabs */}
          <div style={{ display: "flex", borderBottom: `1px solid ${C.line}`, position: "sticky", top: 0, background: C.panel2, zIndex: 2 }}>
            {[
              { id: "clips", label: "Clips", icon: <ListVideo size={15} /> },
              { id: "roster", label: "Roster", icon: <Users size={15} /> },
              { id: "ai", label: "AI reels", icon: <Sparkles size={15} /> },
            ].map((t) => (
              <button key={t.id} onClick={() => setTab(t.id)} className="tbtn"
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "13px 8px", border: "none", background: "transparent", fontSize: 13, fontWeight: 600,
                  color: tab === t.id ? C.amber : C.mute,
                  borderBottom: tab === t.id ? `2px solid ${C.amber}` : "2px solid transparent",
                }}>{t.icon}{t.label}</button>
            ))}
          </div>

          {/* CLIPS */}
          {tab === "clips" && (
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <Select value={filterType} onChange={setFilterType}
                  options={[{ v: "all", l: "All types" }, ...TAG_TYPES.map((t) => ({ v: t.id, l: t.label }))]} />
                <Select value={filterPlayer} onChange={setFilterPlayer}
                  options={[{ v: "all", l: "All players" }, ...roster.map((p) => ({ v: p.id, l: `#${p.num} ${p.name}` }))]} />
              </div>

              {filtered.length === 0 && (
                <Empty>Mark in and out on the video to cut your first clip. It shows up here.</Empty>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {filtered.map((c) => (
                  <div key={c.id} style={{
                    background: c.id === activeClip ? C.panel : C.panel2, border: `1px solid ${c.id === activeClip ? C.amber : C.line}`,
                    borderRadius: 11, padding: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button onClick={() => playClip(c)} className="tbtn" style={{ background: C.amber, color: C.pitch, border: "none", width: 30, height: 30, borderRadius: 8, display: "grid", placeItems: "center" }}>
                        <Play size={14} />
                      </button>
                      <input value={c.name} onChange={(e) => updateClip(c.id, { name: e.target.value })}
                        style={{ flex: 1, background: "transparent", border: "none", color: C.chalk, fontSize: 15, fontWeight: 600 }} />
                      <span style={{ fontSize: 11, color: C.mute }}>{fmt(c.end - c.start)}</span>
                      <button onClick={() => delClip(c.id)} className="tbtn" style={{ background: "transparent", border: "none", color: C.mute }}>
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* tag chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                      {TAG_TYPES.map((t) => {
                        const on = c.tags.includes(t.id);
                        return (
                          <button key={t.id} onClick={() => updateClip(c.id, { tags: toggleIn(c.tags, t.id) })} className="tbtn"
                            style={{
                              fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 600,
                              border: `1px solid ${t.color}`, background: on ? t.color : "transparent",
                              color: on ? C.pitch : t.color,
                            }}>{t.label}</button>
                        );
                      })}
                    </div>

                    {/* player chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                      {roster.map((p) => {
                        const on = c.players.includes(p.id);
                        return (
                          <button key={p.id} onClick={() => updateClip(c.id, { players: toggleIn(c.players, p.id) })} className="tbtn"
                            style={{
                              fontSize: 11, padding: "3px 9px", borderRadius: 6, fontWeight: 600,
                              border: `1px solid ${C.line}`, background: on ? C.grass : "transparent",
                              color: on ? C.pitch : C.mute,
                            }}>#{p.num} {p.name}</button>
                        );
                      })}
                    </div>

                    <input placeholder="Coaching note…" value={c.note}
                      onChange={(e) => updateClip(c.id, { note: e.target.value })}
                      style={{ marginTop: 10, width: "100%", background: C.pitch, border: `1px solid ${C.line}`, borderRadius: 7, padding: "7px 9px", color: C.chalk, fontSize: 13 }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROSTER */}
          {tab === "roster" && (
            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input placeholder="#" value={newNum} onChange={(e) => setNewNum(e.target.value)}
                  style={{ width: 52, background: C.pitch, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px", color: C.chalk, textAlign: "center" }} />
                <input placeholder="Player name" value={newName} onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                  style={{ flex: 1, background: C.pitch, border: `1px solid ${C.line}`, borderRadius: 8, padding: "9px 11px", color: C.chalk }} />
                <button onClick={addPlayer} className="tbtn" style={{ background: C.amber, color: C.pitch, border: "none", borderRadius: 8, padding: "0 14px", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                  <Plus size={16} /> Add
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {roster.map((p) => {
                  const count = clips.filter((c) => c.players.includes(p.id)).length;
                  return (
                    <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 14px" }}>
                      <div className="disp" style={{ width: 38, height: 38, borderRadius: 9, background: C.pitch, color: C.amber, display: "grid", placeItems: "center", fontSize: 20, fontWeight: 700 }}>
                        {p.num}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: C.mute }}>{count} tagged clip{count !== 1 ? "s" : ""}</div>
                      </div>
                      <button onClick={() => { followPlayer(p.id); }} className="tbtn" title="Follow through game"
                        style={{ background: "transparent", border: `1px solid ${C.grass}`, color: C.grass, borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        <Target size={14} /> Follow
                      </button>
                      <button onClick={() => buildReel(p.id)} className="tbtn" title="Build highlight reel"
                        style={{ background: C.amber, color: C.pitch, border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                        <Sparkles size={14} /> Reel
                      </button>
                      <button onClick={() => setRoster((r) => r.filter((x) => x.id !== p.id))} className="tbtn" style={{ background: "transparent", border: "none", color: C.mute }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI REELS */}
          {tab === "ai" && (
            <div style={{ padding: 16 }}>
              {!aiReel && (
                <Empty>
                  Go to <b style={{ color: C.chalk }}>Roster</b> and hit <b style={{ color: C.grass }}>Follow</b> to track a player across the game,
                  or <b style={{ color: C.amber }}>Reel</b> to auto-build their highlight sequence from tagged clips.
                </Empty>
              )}
              {aiReel && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <Sparkles size={18} color={C.amber} />
                    <div className="disp" style={{ fontSize: 22, fontWeight: 700 }}>
                      {aiReel.kind === "follow" ? "FOLLOW" : "HIGHLIGHT REEL"} · #{pNum(aiReel.pid)} {pName(aiReel.pid)}
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: C.mute, marginTop: 0, marginBottom: 14 }}>
                    {aiReel.kind === "follow"
                      ? "Compiled from every clip this player is tagged in, in match order. Plays each in sequence — spotlights from breakdown carry over."
                      : "Ranked by moment weight (goals > defense > transitions). Top plays first."}
                  </p>

                  {aiReel.clips.length === 0 ? (
                    <Empty>No clips tag this player yet. Cut some plays and tag {pName(aiReel.pid)} in them first.</Empty>
                  ) : (
                    <>
                      <button onClick={() => playSequence(aiReel.clips)} className="tbtn"
                        style={{ width: "100%", background: C.grass, color: C.pitch, border: "none", borderRadius: 10, padding: "11px", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 14 }}>
                        <Play size={16} /> Play full sequence ({aiReel.clips.length})
                      </button>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {aiReel.clips.map((c, i) => (
                          <div key={c.id} onClick={() => playClip(c)} className="tbtn"
                            style={{ display: "flex", alignItems: "center", gap: 12, background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, padding: "10px 12px", cursor: "pointer" }}>
                            <span className="disp" style={{ fontSize: 20, color: C.amber, fontWeight: 700, width: 22 }}>{i + 1}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                              <div style={{ display: "flex", gap: 5, marginTop: 3, flexWrap: "wrap" }}>
                                {c.tags.map((t) => {
                                  const tt = TAG_TYPES.find((x) => x.id === t);
                                  return <span key={t} style={{ fontSize: 10, color: tt?.color }}>● {tt?.label}</span>;
                                })}
                                {c.tags.length === 0 && <span style={{ fontSize: 11, color: C.mute }}>untagged</span>}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: C.mute }}>{fmt(c.end - c.start)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

// ---- small components -----------------------------------------------------
function Btn({ children, onClick, primary, title }) {
  return (
    <button onClick={onClick} title={title} className="tbtn"
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "9px 13px", borderRadius: 9,
        border: primary ? "none" : `1px solid ${C.line}`, fontWeight: 600, fontSize: 13,
        background: primary ? C.amber : C.panel, color: primary ? C.pitch : C.chalk,
      }}>{children}</button>
  );
}
function ToolBtn({ children, active, onClick }) {
  return (
    <button onClick={onClick} className="tbtn"
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 7, fontSize: 12, fontWeight: 600,
        border: `1px solid ${active ? C.amber : C.line}`, background: active ? C.amber : "transparent",
        color: active ? C.pitch : C.chalk,
      }}>{children}</button>
  );
}
function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ flex: 1, background: C.panel, color: C.chalk, border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontFamily: "inherit" }}>
      {options.map((o) => <option key={o.v} value={o.v} style={{ background: C.panel }}>{o.l}</option>)}
    </select>
  );
}
function Empty({ children }) {
  return (
    <div style={{ textAlign: "center", color: C.mute, fontSize: 13, padding: "30px 16px", border: `1px dashed ${C.line}`, borderRadius: 12, lineHeight: 1.6 }}>
      {children}
    </div>
  );
}
