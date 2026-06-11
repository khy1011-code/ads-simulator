"use client";

import { useState, useEffect } from "react";

type AdType = "static" | "video" | "carousel";
type Platform = "meta" | "google" | "tiktok" | "linkedin" | "x";
type NoteTag = "creatives" | "ad-copy" | "general";
type Comment = { id: string; text: string };
type Note = { id: string; text: string; tag: NoteTag };

type AdData = {
  id: string;
  pageName: string;
  pageAvatar: string | null;
  bodyCopies: string[];
  headlines: string[];
  mediaUrls: string[];
  mediaType: "image" | "video";
  ctaUrl: string;
  ctaLabel: string;
  customCta: string;
  subheadline: string;
  width: number;
  height: number;
  adType: AdType;
  platform: Platform;
  createdAt: string;
  comments: Comment[];
  notes: Note[];
};

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string }> = {
  meta: { label: "Meta", color: "#1877f2", bg: "#e7f3ff" },
  google: { label: "Google", color: "#4285f4", bg: "#e8f0fe" },
  tiktok: { label: "TikTok", color: "#010101", bg: "#f0f0f0" },
  linkedin: { label: "LinkedIn", color: "#0a66c2", bg: "#e1f0ff" },
  x: { label: "X", color: "#000000", bg: "#f0f0f0" },
};

const REACTIONS = [
  { emoji: "👍", label: "Like" }, { emoji: "❤️", label: "Love" },
  { emoji: "😂", label: "Haha" }, { emoji: "😮", label: "Wow" },
  { emoji: "😢", label: "Sad" }, { emoji: "😡", label: "Angry" },
];

const NOTE_TAG_CONFIG: Record<NoteTag, { label: string; color: string; bg: string }> = {
  creatives: { label: "Creatives", color: "#9333ea", bg: "#f3e8ff" },
  "ad-copy": { label: "Ad Copy", color: "#ea580c", bg: "#fff7ed" },
  general: { label: "General", color: "#65676b", bg: "#f0f2f5" },
};

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function getCtaText(ad: AdData) {
  return ad.ctaLabel === "Custom" && ad.customCta ? ad.customCta : ad.ctaLabel;
}

function loadClientFeedback(adId: string): { comments: Comment[]; notes: Note[] } {
  if (typeof window === "undefined") return { comments: [], notes: [] };
  const raw = localStorage.getItem(`ads-share-feedback-${adId}`);
  return raw ? JSON.parse(raw) : { comments: [], notes: [] };
}

function saveClientFeedback(adId: string, data: { comments: Comment[]; notes: Note[] }) {
  localStorage.setItem(`ads-share-feedback-${adId}`, JSON.stringify(data));
}

export default function SharePage() {
  const [ad, setAd] = useState<AdData | null>(null);
  const [error, setError] = useState(false);
  const [slide, setSlide] = useState(0);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const [clientComments, setClientComments] = useState<Comment[]>([]);
  const [clientNotes, setClientNotes] = useState<Note[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteTag, setNoteTag] = useState<NoteTag>("general");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [saveToast, setSaveToast] = useState(false);

  useEffect(() => {
    try {
      const hash = window.location.hash.slice(1);
      if (!hash) { setError(true); return; }
      const json = decodeURIComponent(atob(hash));
      const parsed = JSON.parse(json) as AdData;
      setAd(parsed);
      const fb = loadClientFeedback(parsed.id);
      setClientComments(fb.comments);
      setClientNotes(fb.notes);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!ad) return;
    saveClientFeedback(ad.id, { comments: clientComments, notes: clientNotes });
  }, [ad, clientComments, clientNotes]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="bg-white rounded-xl p-8 shadow-lg border border-[#dadde1] text-center max-w-md">
          <svg className="w-16 h-16 mx-auto text-[#dadde1] mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <h2 className="text-[20px] font-bold text-[#1c1e21] mb-2">Invalid share link</h2>
          <p className="text-[14px] text-[#65676b]">This link may be expired or malformed. Ask the sender for a new link.</p>
        </div>
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
        <div className="text-[#65676b] text-[14px]">Loading ad preview...</div>
      </div>
    );
  }

  const pCfg = PLATFORM_CONFIG[ad.platform];
  const variants = Math.max(ad.bodyCopies.length, ad.headlines.length);
  const isMulti = variants > 1;
  const slideCount = isMulti ? variants : ad.adType === "carousel" ? Math.max(ad.mediaUrls.length, 1) : 1;
  const currentBody = ad.bodyCopies[slide % ad.bodyCopies.length] || ad.bodyCopies[0];
  const currentHeadline = ad.headlines[slide % ad.headlines.length] || ad.headlines[0];
  const allComments = [...ad.comments, ...clientComments];

  const addComment = () => {
    if (!commentText.trim()) return;
    setClientComments((p) => [...p, { id: uid(), text: commentText.trim() }]);
    setCommentText("");
    flash();
  };
  const deleteComment = (id: string) => {
    setClientComments((p) => p.filter((c) => c.id !== id));
  };
  const startEditComment = (c: Comment) => { setEditingCommentId(c.id); setEditingCommentText(c.text); };
  const saveEditComment = () => {
    if (!editingCommentText.trim()) return;
    setClientComments((p) => p.map((c) => c.id === editingCommentId ? { ...c, text: editingCommentText.trim() } : c));
    setEditingCommentId(null);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setClientNotes((p) => [...p, { id: uid(), text: noteText.trim(), tag: noteTag }]);
    setNoteText("");
    flash();
  };
  const deleteNote = (id: string) => { setClientNotes((p) => p.filter((n) => n.id !== id)); };
  const startEditNote = (n: Note) => { setEditingNoteId(n.id); setEditingNoteText(n.text); };
  const saveEditNote = () => {
    if (!editingNoteText.trim()) return;
    setClientNotes((p) => p.map((n) => n.id === editingNoteId ? { ...n, text: editingNoteText.trim() } : n));
    setEditingNoteId(null);
  };

  function flash() { setSaveToast(true); setTimeout(() => setSaveToast(false), 2000); }

  const bodyTruncated = currentBody.length > 125 && !showFullText;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <header className="bg-[#1877f2] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-4 flex items-center h-14 gap-3">
          <svg className="w-8 h-8" viewBox="0 0 36 36" fill="white">
            <path d="M20.18 35.87C29.17 34.55 36 26.79 36 17.5 36 7.84 28.16 0 18.5 0S1 7.84 1 17.5c0 5.18 2.24 9.83 5.8 13.04V36l5.38-2.96c1.5.42 3.07.64 4.7.64.56 0 1.12-.03 1.67-.08l.03-.01 1.6-.72z" />
            <path d="M14.6 22.88l-4.3-4.58L1.4 22.88l9.72-10.32 4.41 4.58 8.79-4.58z" fill="#1877f2" />
          </svg>
          <h1 className="text-[18px] font-bold tracking-tight">Ad Simulator</h1>
          <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Shared Preview</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: pCfg.bg, color: pCfg.color }}>{pCfg.label}</span>
          </div>
        </div>
      </header>

      {/* Save toast */}
      {saveToast && (
        <div className="fixed top-20 right-4 z-50 bg-[#31a24c] text-white text-[13px] font-semibold px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Saved automatically
        </div>
      )}

      <div className="max-w-[900px] mx-auto p-4 pt-6 flex flex-col md:flex-row gap-6">
        {/* Ad Preview */}
        <div className="md:w-[500px] shrink-0">
          <div className="bg-white rounded-lg shadow-lg border border-[#dadde1] overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2.5 p-3 pb-1">
              <div className="w-10 h-10 rounded-full bg-[#e4e6eb] overflow-hidden shrink-0 flex items-center justify-center">
                {ad.pageAvatar ? <img src={ad.pageAvatar} alt="" className="w-full h-full object-cover" /> :
                  <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-semibold text-[#1c1e21]">{ad.pageName}</div>
                <div className="flex items-center gap-1 text-[13px] text-[#65676b]">
                  <span>Sponsored</span><span>·</span>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 8.5a.5.5 0 01-.5.5H8a.5.5 0 01-.5-.5V4a.5.5 0 011 0v4h3a.5.5 0 01.5.5z" /></svg>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-0.5">
                <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
                  <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" /></svg>
                </button>
              </div>
            </div>

            {/* Body text */}
            <div className="px-4 py-1.5">
              {bodyTruncated ? (
                <p className="text-[15px] text-[#1c1e21] leading-[20px]">
                  {currentBody.slice(0, 125)}...{" "}
                  <button onClick={() => setShowFullText(true)} className="text-[#65676b] font-semibold hover:underline">See more</button>
                </p>
              ) : (
                <p className="text-[15px] text-[#1c1e21] leading-[20px] whitespace-pre-wrap">{currentBody}</p>
              )}
            </div>

            {/* Media area */}
            {slideCount > 1 ? (
              <div className="relative">
                <div className="flex overflow-hidden">
                  {Array.from({ length: slideCount }).map((_, i) => (
                    <div key={i} className="w-full shrink-0 transition-transform duration-300" style={{ transform: `translateX(-${slide * 100}%)` }}>
                      <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
                        {ad.mediaUrls[i % Math.max(ad.mediaUrls.length, 1)] ?
                          <img src={ad.mediaUrls[i % ad.mediaUrls.length]} alt="" className="w-full h-full object-cover" /> :
                          <Placeholder />}
                      </div>
                      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                          <div className="text-[15px] font-semibold text-[#1c1e21] truncate">
                            {isMulti ? (ad.headlines[i % ad.headlines.length] || ad.headlines[0]) : currentHeadline}
                          </div>
                        </div>
                        <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors">
                          {getCtaText(ad)}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                {slideCount > 1 && (
                  <>
                    <button onClick={() => setSlide(Math.max(0, slide - 1))}
                      className="absolute left-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
                      disabled={slide === 0}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button onClick={() => setSlide(Math.min(slideCount - 1, slide + 1))}
                      className="absolute right-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
                      disabled={slide === slideCount - 1}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="bg-[#f0f2f5] flex items-center justify-center overflow-hidden" style={{ height: ad.mediaUrls.length > 0 ? Math.min(ad.height, 500) : 300 }}>
                  {ad.mediaUrls.length === 0 ? <Placeholder /> :
                    ad.mediaType === "video" ? <video src={ad.mediaUrls[0]} controls className="w-full h-full object-cover" /> :
                    <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                  <div className="min-w-0 flex-1 mr-3">
                    <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                    <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{currentHeadline}</div>
                  </div>
                  <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer"
                    className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors">
                    {getCtaText(ad)}
                  </a>
                </div>
              </>
            )}

            {/* Engagement */}
            <div className="px-4 py-1 border-t border-[#dadde1]">
              <div className="flex items-center justify-between py-1 text-[13px] text-[#65676b]">
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center z-10"><span className="text-[10px]">👍</span></span>
                    <span className="w-[18px] h-[18px] rounded-full bg-[#f0284a] flex items-center justify-center"><span className="text-[10px]">❤️</span></span>
                  </div>
                  <span>{selectedReaction ? 143 : 142}</span>
                </div>
                <span>{allComments.length + 23} comments · 8 shares</span>
              </div>
            </div>

            {/* Action bar */}
            <div className="flex border-t border-[#dadde1] px-2 relative">
              <div className="flex-1 relative" onMouseEnter={() => setShowReactionPicker(true)} onMouseLeave={() => setShowReactionPicker(false)}>
                {showReactionPicker && (
                  <div className="absolute bottom-full left-0 mb-1 bg-white rounded-full shadow-lg border border-[#dadde1] px-2 py-1.5 flex gap-1 z-20">
                    {REACTIONS.map((r) => (
                      <button key={r.label} onClick={() => { setSelectedReaction(selectedReaction === r.emoji ? null : r.emoji); setShowReactionPicker(false); }}
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:scale-125 hover:bg-[#f0f2f5] transition-transform text-[20px]" title={r.label}>
                        {r.emoji}
                      </button>
                    ))}
                  </div>
                )}
                <button onClick={() => setSelectedReaction(selectedReaction ? null : "👍")}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-semibold rounded-md transition-colors ${selectedReaction ? "text-[#1877f2]" : "text-[#65676b] hover:bg-[#f0f2f5]"}`}>
                  <span className="text-[18px]">{selectedReaction || "👍"}</span>
                  {selectedReaction ? REACTIONS.find((r) => r.emoji === selectedReaction)?.label || "Like" : "Like"}
                </button>
              </div>
              <button onClick={() => setShowComments(!showComments)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5] rounded-md transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" /></svg>
                Comment
              </button>
            </div>

            {/* Comments */}
            {showComments && (
              <div className="border-t border-[#dadde1] px-4 py-3 space-y-3">
                {/* Owner comments (read-only) */}
                {ad.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#1877f2] shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                    </div>
                    <div className="bg-[#e7f3ff] rounded-2xl px-3 py-2 flex-1">
                      <div className="text-[13px] font-semibold text-[#1877f2]">{ad.pageName}</div>
                      <div className="text-[13px] text-[#1c1e21]">{c.text}</div>
                    </div>
                  </div>
                ))}
                {/* Client comments (editable) */}
                {clientComments.map((c) => (
                  <div key={c.id} className="flex gap-2 group">
                    <div className="w-8 h-8 rounded-full bg-[#e4e6eb] shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                    </div>
                    <div className="flex-1">
                      {editingCommentId === c.id ? (
                        <div className="flex gap-1">
                          <input type="text" value={editingCommentText} onChange={(e) => setEditingCommentText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveEditComment(); if (e.key === "Escape") setEditingCommentId(null); }}
                            autoFocus className="flex-1 px-3 py-1.5 rounded-2xl border border-[#1877f2] text-[13px] outline-none" />
                          <button onClick={saveEditComment} className="text-[#1877f2] text-[11px] font-semibold">Save</button>
                          <button onClick={() => setEditingCommentId(null)} className="text-[#65676b] text-[11px] font-semibold">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1">
                          <div className="bg-[#f0f2f5] rounded-2xl px-3 py-2 flex-1">
                            <div className="text-[13px] font-semibold text-[#1c1e21]">You</div>
                            <div className="text-[13px] text-[#1c1e21]">{c.text}</div>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                            <button onClick={() => startEditComment(c)} className="p-1 rounded-full hover:bg-[#f0f2f5]" title="Edit">
                              <svg className="w-3.5 h-3.5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </button>
                            <button onClick={() => deleteComment(c.id)} className="p-1 rounded-full hover:bg-[#ffebe9]" title="Delete">
                              <svg className="w-3.5 h-3.5 text-[#fa3e3e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* New comment input */}
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#e4e6eb] shrink-0 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
                  </div>
                  <div className="flex-1 flex bg-[#f0f2f5] rounded-full overflow-hidden">
                    <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addComment()} placeholder="Write a comment..."
                      className="flex-1 px-4 py-2 bg-transparent text-[13px] outline-none" />
                    <button onClick={addComment} className="px-3 text-[#1877f2] font-semibold text-[13px] hover:bg-[#e4e6eb] transition-colors">Post</button>
                  </div>
                </div>
              </div>
            )}

            {slideCount > 1 && (
              <div className="flex justify-center gap-1.5 py-2 border-t border-[#dadde1]">
                {Array.from({ length: slideCount }).map((_, i) => (
                  <button key={i} onClick={() => setSlide(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === slide ? "bg-[#1877f2]" : "bg-[#dadde1]"}`} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes / Feedback Panel */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-[#dadde1] p-4 sticky top-[72px]">
            <h3 className="text-[16px] font-semibold text-[#1c1e21] mb-1">Leave Feedback</h3>
            <p className="text-[12px] text-[#65676b] mb-4">Add notes or feedback about this ad. Your comments are saved automatically.</p>

            {/* Add note */}
            <div className="bg-[#f7f8fa] rounded-lg p-3 mb-4 border border-[#e4e6eb]">
              <div className="flex gap-1.5 mb-2">
                {(Object.keys(NOTE_TAG_CONFIG) as NoteTag[]).map((tag) => {
                  const cfg = NOTE_TAG_CONFIG[tag];
                  return (
                    <button key={tag} onClick={() => setNoteTag(tag)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${noteTag === tag ? "text-white" : "hover:opacity-80"}`}
                      style={noteTag === tag ? { backgroundColor: cfg.color } : { backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3}
                placeholder="e.g. Change the headline to be more action-oriented..."
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] resize-none focus:outline-none focus:border-[#1877f2]" />
              <button onClick={addNote} disabled={!noteText.trim()}
                className="mt-2 w-full py-2 rounded-lg bg-[#1877f2] text-white text-[13px] font-semibold hover:bg-[#166fe5] transition-colors disabled:opacity-40">
                Add Note
              </button>
            </div>

            {/* Existing notes */}
            {(clientNotes.length > 0 || ad.notes.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-[12px] font-semibold text-[#65676b] uppercase tracking-wide">Notes</h4>
                {/* Owner notes (read-only) */}
                {ad.notes.map((n) => {
                  const cfg = NOTE_TAG_CONFIG[n.tag];
                  return (
                    <div key={n.id} className="bg-[#f7f8fa] rounded-lg p-3 border border-[#e4e6eb]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                        <span className="text-[10px] font-bold text-[#1877f2]">{ad.pageName}</span>
                      </div>
                      <p className="text-[13px] text-[#1c1e21]">{n.text}</p>
                    </div>
                  );
                })}
                {/* Client notes (editable) */}
                {clientNotes.map((n) => {
                  const cfg = NOTE_TAG_CONFIG[n.tag];
                  return (
                    <div key={n.id} className="bg-white rounded-lg p-3 border border-[#dadde1] group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            <span className="text-[10px] text-[#8a8d91]">You</span>
                          </div>
                          {editingNoteId === n.id ? (
                            <div>
                              <textarea value={editingNoteText} onChange={(e) => setEditingNoteText(e.target.value)} rows={2}
                                autoFocus className="w-full px-3 py-2 rounded-lg border border-[#1877f2] text-[13px] resize-none outline-none" />
                              <div className="flex gap-1 mt-1">
                                <button onClick={saveEditNote} className="text-[11px] text-[#1877f2] font-semibold">Save</button>
                                <button onClick={() => setEditingNoteId(null)} className="text-[11px] text-[#65676b] font-semibold">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[13px] text-[#1c1e21]">{n.text}</p>
                          )}
                        </div>
                        {editingNoteId !== n.id && (
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button onClick={() => startEditNote(n)} className="p-1 rounded hover:bg-[#f0f2f5]" title="Edit">
                              <svg className="w-3.5 h-3.5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                              </svg>
                            </button>
                            <button onClick={() => deleteNote(n.id)} className="p-1 rounded hover:bg-[#ffebe9]" title="Delete">
                              <svg className="w-3.5 h-3.5 text-[#fa3e3e]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {clientNotes.length === 0 && ad.notes.length === 0 && (
              <p className="text-[13px] text-[#8a8d91] text-center py-4">No notes yet. Add your feedback above.</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-[12px] text-[#8a8d91] border-t border-[#dadde1]">
        Shared via Ad Simulator Beta V1
      </footer>
    </div>
  );
}

function Placeholder() {
  return (
    <div className="text-[#8a8d91] text-[14px] flex flex-col items-center gap-2">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
      <span>No media uploaded</span>
    </div>
  );
}
