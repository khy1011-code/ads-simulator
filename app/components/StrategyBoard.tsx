"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type ShapeType = "rect" | "ellipse" | "diamond" | "card" | "text" | "line" | "arrow";
type ToolMode = "select" | ShapeType;

interface BoardElement {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  text: string;
  color: string;
  textColor: string;
  x2?: number;
  y2?: number;
}

interface Board {
  id: string;
  name: string;
  elements: BoardElement[];
  createdAt: string;
}

const COLORS = ["#1877f2", "#42b72a", "#f02849", "#f7b928", "#8b5cf6", "#1c1e21", "#65676b", "#e4e6eb"];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function loadBoards(): Board[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("ads-sim-boards");
  return raw ? JSON.parse(raw) : [];
}
function saveBoards(boards: Board[]) {
  localStorage.setItem("ads-sim-boards", JSON.stringify(boards));
}

export default function StrategyBoard() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [tool, setTool] = useState<ToolMode>("select");
  const [color, setColor] = useState("#1877f2");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [drawing, setDrawing] = useState<{ startX: number; startY: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const loaded = loadBoards();
    setBoards(loaded);
    if (loaded.length > 0) setActiveBoardId(loaded[0].id);
  }, []);

  const activeBoard = boards.find((b) => b.id === activeBoardId) || null;

  const persist = useCallback((updated: Board[]) => {
    setBoards(updated);
    saveBoards(updated);
  }, []);

  const updateElements = useCallback((elements: BoardElement[]) => {
    if (!activeBoardId) return;
    const updated = boards.map((b) => b.id === activeBoardId ? { ...b, elements } : b);
    persist(updated);
  }, [activeBoardId, boards, persist]);

  const createBoard = () => {
    const board: Board = { id: uid(), name: `Strategy ${boards.length + 1}`, elements: [], createdAt: new Date().toISOString() };
    const updated = [...boards, board];
    persist(updated);
    setActiveBoardId(board.id);
  };

  const deleteBoard = (id: string) => {
    const updated = boards.filter((b) => b.id !== id);
    persist(updated);
    if (activeBoardId === id) setActiveBoardId(updated[0]?.id || null);
  };

  const renameBoard = (id: string, name: string) => {
    persist(boards.map((b) => b.id === id ? { ...b, name } : b));
  };

  const getSvgPoint = (e: React.MouseEvent): { x: number; y: number } => {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (editingId) return;
    const pt = getSvgPoint(e);
    if (tool === "select") {
      setSelectedId(null);
      return;
    }
    setDrawing({ startX: pt.x, startY: pt.y });
  };

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !activeBoard) return;
    const pt = getSvgPoint(e);
    const dx = pt.x - drawing.startX;
    const dy = pt.y - drawing.startY;

    const isLine = tool === "line" || tool === "arrow";
    const w = isLine ? 0 : Math.max(Math.abs(dx), 80);
    const h = isLine ? 0 : Math.max(Math.abs(dy), 40);

    const el: BoardElement = {
      id: uid(),
      type: tool as ShapeType,
      x: isLine ? drawing.startX : Math.min(drawing.startX, pt.x),
      y: isLine ? drawing.startY : Math.min(drawing.startY, pt.y),
      w, h,
      text: tool === "card" ? "Project Card" : tool === "text" ? "Text" : "",
      color,
      textColor: "#ffffff",
      ...(isLine ? { x2: pt.x, y2: pt.y } : {}),
    };

    if (tool === "card") {
      el.w = 200; el.h = 120;
      el.textColor = "#1c1e21";
      el.color = "#ffffff";
    }
    if (tool === "text") {
      el.w = 150; el.h = 30;
      el.color = "transparent";
      el.textColor = "#1c1e21";
    }

    updateElements([...activeBoard.elements, el]);
    setSelectedId(el.id);
    setTool("select");
    setDrawing(null);
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: BoardElement) => {
    e.stopPropagation();
    if (tool !== "select") return;
    setSelectedId(el.id);
    const pt = getSvgPoint(e);
    setDragging({ id: el.id, ox: pt.x - el.x, oy: pt.y - el.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !activeBoard) return;
    const pt = getSvgPoint(e);
    const updated = activeBoard.elements.map((el) => {
      if (el.id !== dragging.id) return el;
      const dx = pt.x - dragging.ox - el.x;
      const dy = pt.y - dragging.oy - el.y;
      if (el.type === "line" || el.type === "arrow") {
        return { ...el, x: el.x + dx, y: el.y + dy, x2: (el.x2 || 0) + dx, y2: (el.y2 || 0) + dy };
      }
      return { ...el, x: pt.x - dragging.ox, y: pt.y - dragging.oy };
    });
    updateElements(updated);
  };

  const handleMouseUp = () => { setDragging(null); };

  const deleteSelected = () => {
    if (!selectedId || !activeBoard) return;
    updateElements(activeBoard.elements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!selectedId || !activeBoard) return;
    const el = activeBoard.elements.find((e) => e.id === selectedId);
    if (!el) return;
    const dup = { ...el, id: uid(), x: el.x + 20, y: el.y + 20 };
    if (dup.x2 !== undefined) { dup.x2 = (dup.x2 || 0) + 20; dup.y2 = (dup.y2 || 0) + 20; }
    updateElements([...activeBoard.elements, dup]);
    setSelectedId(dup.id);
  };

  const startEdit = (el: BoardElement) => {
    setEditingId(el.id);
    setEditText(el.text);
  };

  const saveEdit = () => {
    if (!editingId || !activeBoard) return;
    updateElements(activeBoard.elements.map((el) => el.id === editingId ? { ...el, text: editText } : el));
    setEditingId(null);
  };

  const changeSelectedColor = (c: string) => {
    if (!selectedId || !activeBoard) return;
    updateElements(activeBoard.elements.map((el) => el.id === selectedId ? { ...el, color: c } : el));
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (editingId) return;
        deleteSelected();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setTool("select");
        if (editingId) saveEdit();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const tools: { mode: ToolMode; label: string; icon: string }[] = [
    { mode: "select", label: "Select", icon: "M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" },
    { mode: "rect", label: "Rectangle", icon: "M3 5h18v14H3z" },
    { mode: "ellipse", label: "Circle", icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" },
    { mode: "diamond", label: "Diamond", icon: "M12 2l10 10-10 10L2 12z" },
    { mode: "line", label: "Line", icon: "M4 20L20 4" },
    { mode: "arrow", label: "Arrow", icon: "M5 19L19 5m0 0h-6m6 0v6" },
    { mode: "text", label: "Text", icon: "M5 4h14M12 4v16m-4 0h8" },
    { mode: "card", label: "Card", icon: "M4 4h16v4H4zm0 6h16v10H4z" },
  ];

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Board tabs */}
      <div className="bg-white border-b border-[#dadde1] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {boards.map((b) => (
          <div key={b.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer transition-colors shrink-0 ${b.id === activeBoardId ? "bg-[#e7f3ff] text-[#1877f2]" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
            <button onClick={() => setActiveBoardId(b.id)} className="truncate max-w-[120px]">{b.name}</button>
            <button onClick={() => deleteBoard(b.id)} className="ml-1 text-[#fa3e3e] hover:opacity-70 text-[10px]">&times;</button>
          </div>
        ))}
        <button onClick={createBoard} className="px-3 py-1.5 rounded-lg bg-[#1877f2] text-white text-[12px] font-semibold hover:bg-[#166fe5] shrink-0">+ New Board</button>
      </div>

      {!activeBoard ? (
        <div className="flex-1 flex items-center justify-center bg-[#f7f8fa]">
          <div className="text-center">
            <svg className="w-20 h-20 mx-auto text-[#dadde1] mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            <h3 className="text-[18px] font-semibold text-[#1c1e21] mb-2">No strategy boards yet</h3>
            <p className="text-[14px] text-[#65676b] mb-4">Create a board to start mapping your ad strategy.</p>
            <button onClick={createBoard} className="px-6 py-2 rounded-lg bg-[#1877f2] text-white font-semibold hover:bg-[#166fe5]">Create Board</button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Toolbar */}
          <div className="w-12 bg-white border-r border-[#dadde1] flex flex-col items-center py-2 gap-1 shrink-0">
            {tools.map((t) => (
              <button key={t.mode} onClick={() => setTool(t.mode)} title={t.label}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${tool === t.mode ? "bg-[#e7f3ff] text-[#1877f2]" : "text-[#65676b] hover:bg-[#f0f2f5]"}`}>
                <svg className="w-4 h-4" fill={t.mode === "rect" || t.mode === "ellipse" || t.mode === "diamond" ? "none" : "none"} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
              </button>
            ))}
            <div className="border-t border-[#dadde1] w-8 my-1" />
            {/* Color picker */}
            <div className="flex flex-wrap gap-0.5 px-1">
              {COLORS.slice(0, 6).map((c) => (
                <button key={c} onClick={() => { setColor(c); if (selectedId) changeSelectedColor(c); }}
                  className={`w-3.5 h-3.5 rounded-full border-2 ${color === c ? "border-[#1877f2]" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <div className="border-t border-[#dadde1] w-8 my-1" />
            {selectedId && (
              <>
                <button onClick={duplicateSelected} title="Duplicate" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#65676b] hover:bg-[#f0f2f5]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                </button>
                <button onClick={deleteSelected} title="Delete" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#fa3e3e] hover:bg-[#ffebe9]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            )}
          </div>

          {/* Canvas */}
          <div className="flex-1 bg-[#f7f8fa] overflow-hidden relative" style={{ cursor: tool === "select" ? "default" : "crosshair" }}>
            {/* Board name */}
            <div className="absolute top-3 left-3 z-10">
              <input type="text" value={activeBoard.name}
                onChange={(e) => renameBoard(activeBoard.id, e.target.value)}
                className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-[#dadde1] text-[13px] font-semibold text-[#1c1e21] focus:outline-none focus:border-[#1877f2] w-[180px]" />
            </div>
            <div className="absolute top-3 right-3 z-10 text-[10px] text-[#8a8d91] bg-white/80 backdrop-blur-sm px-2 py-1 rounded">
              {activeBoard.elements.length} elements
            </div>
            <svg ref={svgRef}
              className="w-full h-full"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={(e) => { handleMouseUp(); if (drawing) handleCanvasMouseUp(e); }}>
              {/* Grid pattern */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e4e6eb" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {activeBoard.elements.map((el) => (
                <g key={el.id}
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  onDoubleClick={(e) => { e.stopPropagation(); startEdit(el); }}
                  className="cursor-move">
                  {el.type === "rect" && (
                    <>
                      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={6} fill={el.color} stroke={selectedId === el.id ? "#1877f2" : "transparent"} strokeWidth={2} strokeDasharray={selectedId === el.id ? "6 3" : "0"} />
                      {el.text && <text x={el.x + el.w / 2} y={el.y + el.h / 2} textAnchor="middle" dominantBaseline="central" fill={el.textColor} fontSize="13" fontWeight="600">{el.text}</text>}
                    </>
                  )}
                  {el.type === "ellipse" && (
                    <>
                      <ellipse cx={el.x + el.w / 2} cy={el.y + el.h / 2} rx={el.w / 2} ry={el.h / 2} fill={el.color} stroke={selectedId === el.id ? "#1877f2" : "transparent"} strokeWidth={2} strokeDasharray={selectedId === el.id ? "6 3" : "0"} />
                      {el.text && <text x={el.x + el.w / 2} y={el.y + el.h / 2} textAnchor="middle" dominantBaseline="central" fill={el.textColor} fontSize="13" fontWeight="600">{el.text}</text>}
                    </>
                  )}
                  {el.type === "diamond" && (
                    <>
                      <polygon points={`${el.x + el.w / 2},${el.y} ${el.x + el.w},${el.y + el.h / 2} ${el.x + el.w / 2},${el.y + el.h} ${el.x},${el.y + el.h / 2}`} fill={el.color} stroke={selectedId === el.id ? "#1877f2" : "transparent"} strokeWidth={2} strokeDasharray={selectedId === el.id ? "6 3" : "0"} />
                      {el.text && <text x={el.x + el.w / 2} y={el.y + el.h / 2} textAnchor="middle" dominantBaseline="central" fill={el.textColor} fontSize="12" fontWeight="600">{el.text}</text>}
                    </>
                  )}
                  {(el.type === "line" || el.type === "arrow") && (
                    <>
                      <line x1={el.x} y1={el.y} x2={el.x2 || el.x} y2={el.y2 || el.y} stroke={el.color} strokeWidth={2} />
                      {el.type === "arrow" && (
                        <polygon
                          points={(() => {
                            const ax = el.x2 || el.x, ay = el.y2 || el.y;
                            const angle = Math.atan2(ay - el.y, ax - el.x);
                            const s = 10;
                            return `${ax},${ay} ${ax - s * Math.cos(angle - 0.4)},${ay - s * Math.sin(angle - 0.4)} ${ax - s * Math.cos(angle + 0.4)},${ay - s * Math.sin(angle + 0.4)}`;
                          })()}
                          fill={el.color}
                        />
                      )}
                      {selectedId === el.id && (
                        <>
                          <circle cx={el.x} cy={el.y} r={4} fill="#1877f2" />
                          <circle cx={el.x2 || el.x} cy={el.y2 || el.y} r={4} fill="#1877f2" />
                        </>
                      )}
                    </>
                  )}
                  {el.type === "text" && (
                    <>
                      {selectedId === el.id && <rect x={el.x - 2} y={el.y - 2} width={el.w + 4} height={el.h + 4} fill="none" stroke="#1877f2" strokeWidth={1} strokeDasharray="4 2" rx={4} />}
                      <text x={el.x + 4} y={el.y + el.h / 2 + 1} dominantBaseline="central" fill={el.textColor} fontSize="14" fontWeight="500">{el.text}</text>
                    </>
                  )}
                  {el.type === "card" && (
                    <>
                      <rect x={el.x} y={el.y} width={el.w} height={el.h} rx={8} fill="#ffffff" stroke={selectedId === el.id ? "#1877f2" : "#dadde1"} strokeWidth={selectedId === el.id ? 2 : 1} filter="url(#shadow)" />
                      <rect x={el.x} y={el.y} width={el.w} height={8} rx={8} fill={el.color === "#ffffff" ? "#1877f2" : el.color} />
                      <rect x={el.x} y={el.y + 4} width={el.w} height={4} fill={el.color === "#ffffff" ? "#1877f2" : el.color} />
                      <text x={el.x + 12} y={el.y + 28} fill="#1c1e21" fontSize="13" fontWeight="700">{el.text || "Project Card"}</text>
                      <text x={el.x + 12} y={el.y + 46} fill="#65676b" fontSize="11">Double-click to edit</text>
                      <line x1={el.x + 12} y1={el.y + 58} x2={el.x + el.w - 12} y2={el.y + 58} stroke="#e4e6eb" strokeWidth={1} />
                      <text x={el.x + 12} y={el.y + 76} fill="#8a8d91" fontSize="10">Strategy item</text>
                    </>
                  )}
                </g>
              ))}
            </svg>

            {/* Inline text editor overlay */}
            {editingId && (() => {
              const el = activeBoard.elements.find((e) => e.id === editingId);
              if (!el) return null;
              const svgRect = svgRef.current?.getBoundingClientRect();
              if (!svgRect) return null;
              return (
                <div className="absolute z-20" style={{ left: el.x, top: el.y, width: Math.max(el.w, 120) }}>
                  <input type="text" value={editText} onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={saveEdit} autoFocus
                    className="w-full px-2 py-1 border-2 border-[#1877f2] rounded text-[13px] font-semibold outline-none bg-white shadow-lg" />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
