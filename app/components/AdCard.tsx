"use client";

import { useState, useRef, useEffect, lazy, Suspense } from "react";

const StrategyBoard = lazy(() => import("./StrategyBoard"));
const AiChat = lazy(() => import("./AiChat"));
const LandingPageBuilder = lazy(() => import("./LandingPageBuilder"));

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

const CTA_OPTIONS = [
  "Learn more", "Shop now", "Sign up", "Book now", "Contact us",
  "Download", "Get offer", "Get quote", "Subscribe", "Apply now",
  "Watch more", "Send message", "Custom",
];

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

const SEE_MORE_LIMIT = 125;
const MAX_COPIES = 8;

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function createDefaultAd(): AdData {
  return {
    id: uid(), pageName: "Your Brand Name", pageAvatar: null,
    bodyCopies: ["Discover something amazing today! Click below to learn more about our latest offerings."],
    headlines: ["Your Headline Here"],
    mediaUrls: [], mediaType: "image",
    ctaUrl: "https://example.com", ctaLabel: "Learn more", customCta: "",
    subheadline: "yourbrand.com", width: 500, height: 500,
    adType: "static", platform: "meta",
    createdAt: new Date().toISOString(), comments: [], notes: [],
  };
}

function loadAds(): AdData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("ads-simulator-ads-v2");
  return raw ? JSON.parse(raw) : [];
}
function saveAdsToStorage(ads: AdData[]) {
  localStorage.setItem("ads-simulator-ads-v2", JSON.stringify(ads));
}

function getCtaText(ad: AdData) {
  return ad.ctaLabel === "Custom" && ad.customCta ? ad.customCta : ad.ctaLabel;
}

function fileToDataUrl(file: File, maxDim = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (file.type.startsWith("video/")) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdCard() {
  const [mainTab, setMainTab] = useState<"create" | "saved" | "strategy" | "landing">("create");
  const [ad, setAd] = useState<AdData>(createDefaultAd);
  const [savedAds, setSavedAds] = useState<AdData[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true, page: false, content: false, media: false, cta: false, dimensions: false,
  });
  const [previewSlide, setPreviewSlide] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [copied, setCopied] = useState(false);
  const [previewAdId, setPreviewAdId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSavedAds(loadAds()); }, []);

  const updateAd = (u: Partial<AdData>) => setAd((p) => ({ ...p, ...u }));
  const toggleSection = (k: string) => setOpenSections((p) => ({ ...p, [k]: !p[k] }));

  const hasMultipleVariants = ad.bodyCopies.length > 1 || ad.headlines.length > 1;
  const variantCount = Math.max(ad.bodyCopies.length, ad.headlines.length);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith("video/");
      if (ad.adType === "video" && !isVideo) continue;
      if (ad.adType === "static" && isVideo) continue;
      const dataUrl = await fileToDataUrl(file);
      if (ad.adType === "carousel") {
        setAd((p) => ({ ...p, mediaUrls: [...p.mediaUrls, dataUrl], mediaType: "image" }));
      } else {
        updateAd({ mediaUrls: [dataUrl], mediaType: isVideo ? "video" : "image" });
      }
    }
    e.target.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file, 200, 0.8);
    updateAd({ pageAvatar: dataUrl });
    e.target.value = "";
  };

  const removeSlide = (i: number) => {
    const next = ad.mediaUrls.filter((_, idx) => idx !== i);
    updateAd({ mediaUrls: next });
    if (previewSlide >= next.length && next.length > 0) setPreviewSlide(next.length - 1);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    const existing = loadAds();
    const idx = existing.findIndex((a) => a.id === ad.id);
    const toSave = { ...ad, createdAt: idx >= 0 ? ad.createdAt : new Date().toISOString() };
    if (idx >= 0) existing[idx] = toSave; else existing.unshift(toSave);
    saveAdsToStorage(existing);
    setSavedAds(existing);
    setEditingId(ad.id);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const handleDelete = (id: string) => {
    const next = loadAds().filter((a) => a.id !== id);
    saveAdsToStorage(next);
    setSavedAds(next);
    if (editingId === id) { setAd(createDefaultAd()); setEditingId(null); }
    if (previewAdId === id) setPreviewAdId(null);
  };

  const handleLoadAd = (a: AdData) => {
    setAd({ ...a }); setEditingId(a.id); setMainTab("create");
    setPreviewSlide(0); resetPreview();
  };

  const handleNewAd = () => {
    setAd(createDefaultAd()); setEditingId(null);
    setPreviewSlide(0); resetPreview();
  };

  const resetPreview = () => {
    setSelectedReaction(null); setShowFullText(false);
    setShowComments(false); setCommentText("");
    setEditingCommentId(null);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    updateAd({ comments: [...ad.comments, { id: uid(), text: commentText.trim() }] });
    setCommentText("");
  };

  const deleteComment = (id: string) => {
    updateAd({ comments: ad.comments.filter((c) => c.id !== id) });
  };

  const startEditComment = (c: Comment) => {
    setEditingCommentId(c.id); setEditingCommentText(c.text);
  };

  const saveEditComment = () => {
    if (!editingCommentText.trim()) return;
    updateAd({
      comments: ad.comments.map((c) =>
        c.id === editingCommentId ? { ...c, text: editingCommentText.trim() } : c
      ),
    });
    setEditingCommentId(null); setEditingCommentText("");
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`Check out this ad from ${ad.pageName}: ${ad.headlines[0]}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  // Update saved ad notes
  const updateSavedAdNotes = (adId: string, notes: Note[]) => {
    const all = loadAds().map((a) => a.id === adId ? { ...a, notes } : a);
    saveAdsToStorage(all);
    setSavedAds(all);
    if (ad.id === adId) updateAd({ notes });
  };

  const cardMaxWidth = ad.adType === "carousel" || hasMultipleVariants ? 500 : Math.max(320, Math.min(ad.width, 700));
  const platformCfg = PLATFORM_CONFIG[ad.platform];
  const currentBody = ad.bodyCopies[previewSlide % ad.bodyCopies.length] || ad.bodyCopies[0];
  const currentHeadline = ad.headlines[previewSlide % ad.headlines.length] || ad.headlines[0];
  const previewAd = previewAdId ? savedAds.find((a) => a.id === previewAdId) : null;

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Header */}
      <header className="bg-[#1877f2] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8" viewBox="0 0 36 36" fill="white">
              <path d="M20.18 35.87C29.17 34.55 36 26.79 36 17.5 36 7.84 28.16 0 18.5 0S1 7.84 1 17.5c0 5.18 2.24 9.83 5.8 13.04V36l5.38-2.96c1.5.42 3.07.64 4.7.64.56 0 1.12-.03 1.67-.08l.03-.01 1.6-.72z" />
              <path d="M14.6 22.88l-4.3-4.58L1.4 22.88l9.72-10.32 4.41 4.58 8.79-4.58z" fill="#1877f2" />
            </svg>
            <h1 className="text-[18px] font-bold tracking-tight">Ad Simulator</h1>
            <span className="text-[10px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Beta V1</span>
          </div>
          <div className="flex bg-white/10 rounded-lg p-0.5 overflow-x-auto">
            <button onClick={() => setMainTab("create")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all shrink-0 ${mainTab === "create" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"}`}>
              Create Ad
            </button>
            <button onClick={() => setMainTab("saved")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all shrink-0 ${mainTab === "saved" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"}`}>
              Saved Ad Samples {savedAds.length > 0 && `(${savedAds.length})`}
            </button>
            <button onClick={() => setMainTab("strategy")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all shrink-0 ${mainTab === "strategy" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"}`}>
              Ad Strategy
            </button>
            <button onClick={() => setMainTab("landing")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all shrink-0 ${mainTab === "landing" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"}`}>
              Landing Pages
            </button>
          </div>
        </div>
      </header>

      {mainTab === "strategy" ? (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="text-[#65676b]">Loading...</div></div>}>
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1"><StrategyBoard /></div>
            <AiChat />
          </div>
        </Suspense>
      ) : mainTab === "landing" ? (
        <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="text-[#65676b]">Loading...</div></div>}>
          <LandingPageBuilder />
        </Suspense>
      ) : mainTab === "saved" ? (
        <SavedAdsTab ads={savedAds} onLoad={handleLoadAd} onDelete={handleDelete}
          previewAdId={previewAdId} setPreviewAdId={setPreviewAdId}
          updateNotes={updateSavedAdNotes} />
      ) : (
        <div className="flex flex-col md:flex-row gap-6 max-w-[1400px] mx-auto p-4 pt-6">
          {/* Left Panel */}
          <div className="md:w-[320px] shrink-0 space-y-2">
            <div className="flex gap-2 mb-3">
              <button onClick={handleSave}
                className="flex-1 py-2.5 rounded-lg bg-[#1877f2] text-white text-[13px] font-semibold hover:bg-[#166fe5] transition-colors">
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : editingId ? "Update Ad" : "Save Ad"}
              </button>
              <button onClick={handleNewAd}
                className="flex-1 py-2.5 rounded-lg bg-white text-[#1c1e21] text-[13px] font-semibold hover:bg-[#f0f2f5] transition-colors border border-[#dadde1]">
                + New Ad
              </button>
            </div>

            <Accordion title="Ad Type & Platform" isOpen={openSections.type} onToggle={() => toggleSection("type")}>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1.5 uppercase tracking-wide">Format</label>
                  <div className="flex gap-1.5">
                    {(["static", "video", "carousel"] as AdType[]).map((t) => (
                      <button key={t} onClick={() => { updateAd({ adType: t, mediaUrls: [] }); setPreviewSlide(0); }}
                        className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all ${ad.adType === t ? "bg-[#1877f2] text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1.5 uppercase tracking-wide">Platform</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => (
                      <button key={p} onClick={() => updateAd({ platform: p })}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${ad.platform === p ? "text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}
                        style={ad.platform === p ? { backgroundColor: PLATFORM_CONFIG[p].color } : undefined}>
                        {PLATFORM_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="Page Info" isOpen={openSections.page} onToggle={() => toggleSection("page")}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Page Name</label>
                  <input type="text" value={ad.pageName} onChange={(e) => updateAd({ pageName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Avatar</label>
                  <button onClick={() => avatarInputRef.current?.click()} className="text-[12px] text-[#1877f2] font-semibold hover:underline">
                    {ad.pageAvatar ? "Change avatar" : "Upload avatar"}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>
            </Accordion>

            <Accordion title={`Ad Content (${ad.bodyCopies.length} copy, ${ad.headlines.length} headline)`}
              isOpen={openSections.content} onToggle={() => toggleSection("content")}>
              <div className="space-y-3">
                {/* Ad Copies */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#65676b] uppercase tracking-wide">
                      Ad Copies ({ad.bodyCopies.length}/{MAX_COPIES})
                    </label>
                    {ad.bodyCopies.length < MAX_COPIES && (
                      <button onClick={() => updateAd({ bodyCopies: [...ad.bodyCopies, ""] })}
                        className="text-[11px] text-[#1877f2] font-semibold hover:underline">+ Add copy</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {ad.bodyCopies.map((copy, i) => (
                      <div key={i} className="relative">
                        <div className="flex items-start gap-1">
                          <span className="text-[10px] font-bold text-[#8a8d91] mt-2 shrink-0 w-4">{i + 1}.</span>
                          <textarea value={copy} rows={2}
                            onChange={(e) => {
                              const next = [...ad.bodyCopies];
                              next[i] = e.target.value;
                              updateAd({ bodyCopies: next });
                            }}
                            placeholder={`Ad copy ${i + 1}...`}
                            className="flex-1 px-3 py-2 rounded-lg border border-[#dadde1] text-[12px] resize-none focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                          {ad.bodyCopies.length > 1 && (
                            <button onClick={() => updateAd({ bodyCopies: ad.bodyCopies.filter((_, j) => j !== i) })}
                              className="text-[#fa3e3e] mt-2 shrink-0 hover:opacity-70">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Headlines */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-[#65676b] uppercase tracking-wide">
                      Headlines ({ad.headlines.length}/{MAX_COPIES})
                    </label>
                    {ad.headlines.length < MAX_COPIES && (
                      <button onClick={() => updateAd({ headlines: [...ad.headlines, ""] })}
                        className="text-[11px] text-[#1877f2] font-semibold hover:underline">+ Add headline</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {ad.headlines.map((h, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-[#8a8d91] shrink-0 w-4">{i + 1}.</span>
                        <input type="text" value={h}
                          onChange={(e) => {
                            const next = [...ad.headlines];
                            next[i] = e.target.value;
                            updateAd({ headlines: next });
                          }}
                          placeholder={`Headline ${i + 1}...`}
                          className="flex-1 px-3 py-2 rounded-lg border border-[#dadde1] text-[12px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                        {ad.headlines.length > 1 && (
                          <button onClick={() => updateAd({ headlines: ad.headlines.filter((_, j) => j !== i) })}
                            className="text-[#fa3e3e] shrink-0 hover:opacity-70">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Display Link */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Display Link</label>
                  <input type="text" value={ad.subheadline} onChange={(e) => updateAd({ subheadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[12px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>

                {hasMultipleVariants && (
                  <div className="bg-[#e7f3ff] text-[#1877f2] text-[11px] font-semibold px-3 py-2 rounded-lg">
                    {variantCount} variant{variantCount > 1 ? "s" : ""} detected — preview shows as carousel cards
                  </div>
                )}
              </div>
            </Accordion>

            <Accordion title="Media" isOpen={openSections.media} onToggle={() => toggleSection("media")}>
              <div className="space-y-2.5">
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-lg bg-[#e7f3ff] text-[#1877f2] text-[12px] font-semibold hover:bg-[#d2e8ff] transition-colors">
                  {ad.adType === "video" ? "Upload Video" : `Upload Image${ad.adType === "carousel" ? "(s)" : ""}`}
                </button>
                <input ref={fileInputRef} type="file" accept={ad.adType === "video" ? "video/*" : "image/*"}
                  multiple={ad.adType === "carousel"} onChange={handleMediaUpload} className="hidden" />
                {ad.mediaUrls.length > 0 && (
                  <div className="space-y-1">
                    {ad.mediaUrls.map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-[#f0f2f5] rounded-md text-[12px]">
                        <span className="text-[#65676b]">{ad.mediaType === "video" ? "Video" : `Image ${i + 1}`}</span>
                        <button onClick={() => removeSlide(i)} className="text-[#fa3e3e] font-semibold text-[11px]">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Accordion>

            <Accordion title="CTA Button" isOpen={openSections.cta} onToggle={() => toggleSection("cta")}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Button Text</label>
                  <select value={ad.ctaLabel} onChange={(e) => updateAd({ ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] bg-white">
                    {CTA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                {ad.ctaLabel === "Custom" && (
                  <div>
                    <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Custom CTA Text</label>
                    <input type="text" value={ad.customCta} onChange={(e) => updateAd({ customCta: e.target.value })}
                      placeholder="Enter your CTA text..."
                      className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                  </div>
                )}
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Destination URL</label>
                  <input type="text" value={ad.ctaUrl} onChange={(e) => updateAd({ ctaUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
              </div>
            </Accordion>

            {ad.adType !== "carousel" && !hasMultipleVariants && (
              <Accordion title="Dimensions" isOpen={openSections.dimensions} onToggle={() => toggleSection("dimensions")}>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Width</label>
                    <input type="number" value={ad.width} min={320} max={700}
                      onChange={(e) => updateAd({ width: parseInt(e.target.value) || 320 })}
                      className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2]" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Height</label>
                    <input type="number" value={ad.height} min={200} max={700}
                      onChange={(e) => updateAd({ height: parseInt(e.target.value) || 320 })}
                      className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2]" />
                  </div>
                </div>
                <p className="text-[10px] text-[#8a8d91] mt-1">{ad.width}×{ad.height}px</p>
              </Accordion>
            )}
          </div>

          {/* Right Panel - Preview */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12px] font-semibold text-[#65676b] uppercase tracking-wide">Ad Preview</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: platformCfg.bg, color: platformCfg.color }}>{platformCfg.label}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0f2f5] text-[#65676b] capitalize">
                {hasMultipleVariants ? `${variantCount} variants` : ad.adType}
              </span>
            </div>

            {/* When multiple variants, show carousel of ad card versions */}
            {hasMultipleVariants ? (
              <div className="w-full" style={{ maxWidth: cardMaxWidth }}>
                <div className="bg-white rounded-lg shadow-lg border border-[#dadde1] overflow-hidden">
                  <AdPreviewHeader ad={ad} />
                  {/* Variant body text */}
                  <div className="px-4 py-1.5">
                    <BodyText text={currentBody} showFull={showFullText} onToggle={() => setShowFullText(!showFullText)} />
                  </div>
                  {/* Carousel of variants */}
                  <div className="relative">
                    <div className="flex overflow-hidden">
                      {Array.from({ length: variantCount }).map((_, i) => (
                        <div key={i} className="w-full shrink-0 transition-transform duration-300" style={{ transform: `translateX(-${previewSlide * 100}%)` }}>
                          <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
                            {ad.mediaUrls[i % Math.max(ad.mediaUrls.length, 1)] ? (
                              <img src={ad.mediaUrls[i % ad.mediaUrls.length]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MediaPlaceholder />
                            )}
                          </div>
                          <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                            <div className="min-w-0 flex-1 mr-3">
                              <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                              <div className="text-[15px] font-semibold text-[#1c1e21] truncate">
                                {ad.headlines[i % ad.headlines.length] || ad.headlines[0]}
                              </div>
                            </div>
                            <CtaButton ad={ad} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {variantCount > 1 && (
                      <NavButtons current={previewSlide} total={variantCount} onChange={setPreviewSlide} />
                    )}
                  </div>
                  <EngagementBar selectedReaction={selectedReaction} commentCount={ad.comments.length + 23} />
                  <ActionBar selectedReaction={selectedReaction} setSelectedReaction={setSelectedReaction}
                    showReactionPicker={showReactionPicker} setShowReactionPicker={setShowReactionPicker}
                    showComments={showComments} setShowComments={setShowComments}
                    copied={copied} onShare={handleShare} />
                  {showComments && (
                    <CommentsSection comments={ad.comments} commentText={commentText} setCommentText={setCommentText}
                      addComment={addComment} deleteComment={deleteComment}
                      editingId={editingCommentId} editingText={editingCommentText}
                      setEditingText={setEditingCommentText} startEdit={startEditComment} saveEdit={saveEditComment}
                      cancelEdit={() => setEditingCommentId(null)} />
                  )}
                </div>
                <div className="flex justify-center gap-1.5 mt-3">
                  {Array.from({ length: variantCount }).map((_, i) => (
                    <button key={i} onClick={() => setPreviewSlide(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === previewSlide ? "bg-[#1877f2]" : "bg-[#dadde1]"}`} />
                  ))}
                </div>
              </div>
            ) : (
              /* Single ad preview */
              <div className="bg-white rounded-lg shadow-lg border border-[#dadde1] overflow-hidden" style={{ width: cardMaxWidth, maxWidth: "100%" }}>
                <AdPreviewHeader ad={ad} />
                <div className="px-4 py-1.5">
                  <BodyText text={currentBody} showFull={showFullText} onToggle={() => setShowFullText(!showFullText)} />
                </div>
                {ad.adType === "carousel" ? (
                  <div className="relative">
                    <div className="flex overflow-hidden">
                      {(ad.mediaUrls.length > 0 ? ad.mediaUrls : [""]).map((url, i) => (
                        <div key={i} className="w-full shrink-0 transition-transform duration-300" style={{ transform: `translateX(-${previewSlide * 100}%)` }}>
                          <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
                            {url ? <img src={url} alt="" className="w-full h-full object-cover" /> : <MediaPlaceholder />}
                          </div>
                          <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                            <div className="min-w-0 flex-1 mr-3">
                              <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                              <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{currentHeadline}</div>
                            </div>
                            <CtaButton ad={ad} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {ad.mediaUrls.length > 1 && (
                      <NavButtons current={previewSlide} total={ad.mediaUrls.length} onChange={setPreviewSlide} />
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-[#f0f2f5] flex items-center justify-center overflow-hidden" style={{ height: ad.mediaUrls.length > 0 ? ad.height : 300 }}>
                      {ad.mediaUrls.length === 0 ? <MediaPlaceholder /> :
                        ad.mediaType === "video" ? <video src={ad.mediaUrls[0]} controls className="w-full h-full object-cover" /> :
                        <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                        <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{currentHeadline}</div>
                      </div>
                      <CtaButton ad={ad} />
                    </div>
                  </>
                )}
                <EngagementBar selectedReaction={selectedReaction} commentCount={ad.comments.length + 23} />
                <ActionBar selectedReaction={selectedReaction} setSelectedReaction={setSelectedReaction}
                  showReactionPicker={showReactionPicker} setShowReactionPicker={setShowReactionPicker}
                  showComments={showComments} setShowComments={setShowComments}
                  copied={copied} onShare={handleShare} />
                {showComments && (
                  <CommentsSection comments={ad.comments} commentText={commentText} setCommentText={setCommentText}
                    addComment={addComment} deleteComment={deleteComment}
                    editingId={editingCommentId} editingText={editingCommentText}
                    setEditingText={setEditingCommentText} startEdit={startEditComment} saveEdit={saveEditComment}
                    cancelEdit={() => setEditingCommentId(null)} />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal for Saved Ads */}
      {previewAd && (
        <PreviewModal ad={previewAd} onClose={() => setPreviewAdId(null)}
          updateNotes={updateSavedAdNotes} />
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

function Accordion({ title, isOpen, onToggle, children }: {
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#dadde1] overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold text-[#1c1e21] hover:bg-[#f7f8fa] transition-colors">
        {title}
        <svg className={`w-4 h-4 text-[#65676b] transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function AdPreviewHeader({ ad }: { ad: AdData }) {
  return (
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
        <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
          <svg className="w-5 h-5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  );
}

function BodyText({ text, showFull, onToggle }: { text: string; showFull: boolean; onToggle: () => void }) {
  if (text.length > SEE_MORE_LIMIT && !showFull) {
    return (
      <p className="text-[15px] text-[#1c1e21] leading-[20px]">
        {text.slice(0, SEE_MORE_LIMIT)}...{" "}
        <button onClick={onToggle} className="text-[#65676b] font-semibold hover:underline">See more</button>
      </p>
    );
  }
  return <p className="text-[15px] text-[#1c1e21] leading-[20px] whitespace-pre-wrap">{text}</p>;
}

function MediaPlaceholder() {
  return (
    <div className="text-[#8a8d91] text-[14px] flex flex-col items-center gap-2">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
      <span>No media uploaded</span>
    </div>
  );
}

function CtaButton({ ad }: { ad: AdData }) {
  return (
    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer"
      className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors">
      {getCtaText(ad)}
    </a>
  );
}

function NavButtons({ current, total, onChange }: { current: number; total: number; onChange: (i: number) => void }) {
  return (
    <>
      <button onClick={() => onChange(Math.max(0, current - 1))}
        className="absolute left-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
        disabled={current === 0}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <button onClick={() => onChange(Math.min(total - 1, current + 1))}
        className="absolute right-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
        disabled={current === total - 1}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </>
  );
}

function EngagementBar({ selectedReaction, commentCount }: { selectedReaction: string | null; commentCount: number }) {
  return (
    <div className="px-4 py-1 border-t border-[#dadde1]">
      <div className="flex items-center justify-between py-1 text-[13px] text-[#65676b]">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-1">
            <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center z-10"><span className="text-[10px]">👍</span></span>
            <span className="w-[18px] h-[18px] rounded-full bg-[#f0284a] flex items-center justify-center"><span className="text-[10px]">❤️</span></span>
          </div>
          <span>{selectedReaction ? 143 : 142}</span>
        </div>
        <span>{commentCount} comments · 8 shares</span>
      </div>
    </div>
  );
}

function ActionBar({ selectedReaction, setSelectedReaction, showReactionPicker, setShowReactionPicker, showComments, setShowComments, copied, onShare }: {
  selectedReaction: string | null; setSelectedReaction: (r: string | null) => void;
  showReactionPicker: boolean; setShowReactionPicker: (b: boolean) => void;
  showComments: boolean; setShowComments: (b: boolean) => void;
  copied: boolean; onShare: () => void;
}) {
  return (
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
      <button onClick={onShare}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5] rounded-md transition-colors">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}

function CommentsSection({ comments, commentText, setCommentText, addComment, deleteComment, editingId, editingText, setEditingText, startEdit, saveEdit, cancelEdit }: {
  comments: Comment[]; commentText: string; setCommentText: (t: string) => void;
  addComment: () => void; deleteComment: (id: string) => void;
  editingId: string | null; editingText: string; setEditingText: (t: string) => void;
  startEdit: (c: Comment) => void; saveEdit: () => void; cancelEdit: () => void;
}) {
  return (
    <div className="border-t border-[#dadde1] px-4 py-3 space-y-3">
      {comments.map((c) => (
        <div key={c.id} className="flex gap-2 group">
          <div className="w-8 h-8 rounded-full bg-[#e4e6eb] shrink-0 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>
          </div>
          <div className="flex-1">
            {editingId === c.id ? (
              <div className="flex gap-1">
                <input type="text" value={editingText} onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                  autoFocus className="flex-1 px-3 py-1.5 rounded-2xl border border-[#1877f2] text-[13px] outline-none" />
                <button onClick={saveEdit} className="text-[#1877f2] text-[11px] font-semibold">Save</button>
                <button onClick={cancelEdit} className="text-[#65676b] text-[11px] font-semibold">Cancel</button>
              </div>
            ) : (
              <div className="flex items-start gap-1">
                <div className="bg-[#f0f2f5] rounded-2xl px-3 py-2 flex-1">
                  <div className="text-[13px] font-semibold text-[#1c1e21]">You</div>
                  <div className="text-[13px] text-[#1c1e21]">{c.text}</div>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                  <button onClick={() => startEdit(c)} className="p-1 rounded-full hover:bg-[#f0f2f5]" title="Edit">
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
  );
}

function SavedAdsTab({ ads, onLoad, onDelete, previewAdId, setPreviewAdId, updateNotes }: {
  ads: AdData[]; onLoad: (a: AdData) => void; onDelete: (id: string) => void;
  previewAdId: string | null; setPreviewAdId: (id: string | null) => void;
  updateNotes: (id: string, notes: Note[]) => void;
}) {
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const handleShare = (ad: AdData) => {
    const encoded = btoa(encodeURIComponent(JSON.stringify(ad)));
    const url = `${window.location.origin}/share#${encoded}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(ad.id);
    setTimeout(() => setCopiedShareId(null), 2500);
  };

  if (ads.length === 0) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center">
        <div className="bg-white rounded-xl p-12 shadow-sm border border-[#dadde1]">
          <svg className="w-16 h-16 mx-auto text-[#dadde1] mb-4" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="text-[18px] font-semibold text-[#1c1e21] mb-2">No saved ad samples yet</h3>
          <p className="text-[14px] text-[#65676b]">Create your first ad and save it to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto p-4 pt-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => {
          const pCfg = PLATFORM_CONFIG[ad.platform];
          const variants = Math.max(ad.bodyCopies.length, ad.headlines.length);
          return (
            <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-[#dadde1] overflow-hidden hover:shadow-md transition-shadow">
              <div className="aspect-video bg-[#f0f2f5] flex items-center justify-center overflow-hidden relative">
                {ad.mediaUrls.length > 0 ? (
                  ad.mediaType === "video" ? <video src={ad.mediaUrls[0]} className="w-full h-full object-cover" /> :
                  <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-12 h-12 text-[#dadde1]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: pCfg.color }}>{pCfg.label}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white capitalize">{ad.adType}</span>
                  {variants > 1 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1877f2] text-white">{variants} variants</span>}
                </div>
                {/* Eye icon for preview */}
                <button onClick={() => setPreviewAdId(ad.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors"
                  title="Preview ad">
                  <svg className="w-4 h-4 text-[#1c1e21]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-[#e4e6eb] overflow-hidden shrink-0 flex items-center justify-center">
                    {ad.pageAvatar ? <img src={ad.pageAvatar} alt="" className="w-full h-full object-cover" /> :
                      <svg className="w-3 h-3 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20"><path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" /></svg>}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1c1e21] truncate">{ad.pageName}</span>
                </div>
                <p className="text-[12px] text-[#65676b] line-clamp-2 mb-1">{ad.bodyCopies[0]}</p>
                <div className="text-[14px] font-semibold text-[#1c1e21] truncate mb-1">{ad.headlines[0]}</div>
                {/* Notes preview */}
                {ad.notes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-1">
                    {ad.notes.slice(0, 3).map((n) => {
                      const cfg = NOTE_TAG_CONFIG[n.tag];
                      return <span key={n.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
                    })}
                    {ad.notes.length > 3 && <span className="text-[9px] text-[#65676b]">+{ad.notes.length - 3}</span>}
                  </div>
                )}
                <div className="text-[10px] text-[#8a8d91]">{new Date(ad.createdAt).toLocaleDateString()}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onLoad(ad)} className="flex-1 py-1.5 rounded-md bg-[#1877f2] text-white text-[12px] font-semibold hover:bg-[#166fe5] transition-colors">Edit</button>
                  <button onClick={() => setPreviewAdId(ad.id)} className="py-1.5 px-3 rounded-md bg-[#e7f3ff] text-[#1877f2] text-[12px] font-semibold hover:bg-[#d2e8ff] transition-colors" title="Preview">
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button onClick={() => handleShare(ad)}
                    className={`py-1.5 px-3 rounded-md text-[12px] font-semibold transition-colors ${copiedShareId === ad.id ? "bg-[#31a24c] text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}
                    title={copiedShareId === ad.id ? "Link copied!" : "Share link"}>
                    {copiedShareId === ad.id ? (
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                      </svg>
                    )}
                  </button>
                  <button onClick={() => onDelete(ad.id)} className="py-1.5 px-3 rounded-md bg-[#ffebe9] text-[#d1242f] text-[12px] font-semibold hover:bg-[#ffd4d0] transition-colors">Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreviewModal({ ad, onClose, updateNotes }: {
  ad: AdData; onClose: () => void; updateNotes: (id: string, notes: Note[]) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [noteTag, setNoteTag] = useState<NoteTag>("general");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [slide, setSlide] = useState(0);

  const variants = Math.max(ad.bodyCopies.length, ad.headlines.length);
  const isMulti = variants > 1;
  const currentBody = ad.bodyCopies[slide % ad.bodyCopies.length] || ad.bodyCopies[0];
  const currentHeadline = ad.headlines[slide % ad.headlines.length] || ad.headlines[0];

  const addNote = () => {
    if (!noteText.trim()) return;
    updateNotes(ad.id, [...ad.notes, { id: uid(), text: noteText.trim(), tag: noteTag }]);
    setNoteText("");
  };

  const deleteNote = (id: string) => {
    updateNotes(ad.id, ad.notes.filter((n) => n.id !== id));
  };

  const startEditNote = (n: Note) => { setEditingNoteId(n.id); setEditingNoteText(n.text); };
  const saveEditNote = () => {
    if (!editingNoteText.trim()) return;
    updateNotes(ad.id, ad.notes.map((n) => n.id === editingNoteId ? { ...n, text: editingNoteText.trim() } : n));
    setEditingNoteId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-8 pb-8 overflow-y-auto" onClick={onClose}>
      <div className="bg-[#f0f2f5] rounded-xl shadow-2xl w-full max-w-[900px] mx-4 flex flex-col md:flex-row overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Left: Ad Preview */}
        <div className="md:w-[500px] shrink-0 bg-white overflow-y-auto max-h-[85vh]">
          <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-4 py-3 border-b border-[#dadde1]">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold text-[#1c1e21]">Ad Preview</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: PLATFORM_CONFIG[ad.platform].bg, color: PLATFORM_CONFIG[ad.platform].color }}>
                {PLATFORM_CONFIG[ad.platform].label}
              </span>
            </div>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-[#f0f2f5]">
              <svg className="w-5 h-5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <AdPreviewHeader ad={ad} />
          <div className="px-4 py-1.5">
            <p className="text-[15px] text-[#1c1e21] leading-[20px] whitespace-pre-wrap">{currentBody}</p>
          </div>
          {isMulti || ad.adType === "carousel" ? (
            <div className="relative">
              <div className="flex overflow-hidden">
                {Array.from({ length: isMulti ? variants : Math.max(ad.mediaUrls.length, 1) }).map((_, i) => (
                  <div key={i} className="w-full shrink-0 transition-transform duration-300" style={{ transform: `translateX(-${slide * 100}%)` }}>
                    <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
                      {ad.mediaUrls[i % Math.max(ad.mediaUrls.length, 1)] ?
                        <img src={ad.mediaUrls[i % ad.mediaUrls.length]} alt="" className="w-full h-full object-cover" /> :
                        <MediaPlaceholder />}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                        <div className="text-[15px] font-semibold text-[#1c1e21] truncate">
                          {isMulti ? (ad.headlines[i % ad.headlines.length] || ad.headlines[0]) : currentHeadline}
                        </div>
                      </div>
                      <CtaButton ad={ad} />
                    </div>
                  </div>
                ))}
              </div>
              {(isMulti ? variants : ad.mediaUrls.length) > 1 && (
                <NavButtons current={slide} total={isMulti ? variants : ad.mediaUrls.length} onChange={setSlide} />
              )}
            </div>
          ) : (
            <>
              <div className="bg-[#f0f2f5] flex items-center justify-center overflow-hidden" style={{ height: ad.mediaUrls.length > 0 ? Math.min(ad.height, 400) : 250 }}>
                {ad.mediaUrls.length === 0 ? <MediaPlaceholder /> :
                  ad.mediaType === "video" ? <video src={ad.mediaUrls[0]} controls className="w-full h-full object-cover" /> :
                  <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                <div className="min-w-0 flex-1 mr-3">
                  <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                  <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{currentHeadline}</div>
                </div>
                <CtaButton ad={ad} />
              </div>
            </>
          )}
          <EngagementBar selectedReaction={null} commentCount={ad.comments.length + 23} />
        </div>

        {/* Right: Notes / Feedback */}
        <div className="flex-1 p-4 overflow-y-auto max-h-[85vh] border-l border-[#dadde1]">
          <h3 className="text-[15px] font-semibold text-[#1c1e21] mb-3">Notes & Feedback</h3>

          {/* Add note */}
          <div className="bg-white rounded-lg p-3 mb-3 border border-[#dadde1]">
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
            <div className="flex gap-2">
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={2}
                placeholder="Add a note about this ad..."
                className="flex-1 px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] resize-none focus:outline-none focus:border-[#1877f2]" />
            </div>
            <button onClick={addNote} disabled={!noteText.trim()}
              className="mt-2 px-4 py-1.5 rounded-md bg-[#1877f2] text-white text-[12px] font-semibold hover:bg-[#166fe5] transition-colors disabled:opacity-40">
              Add Note
            </button>
          </div>

          {/* Notes list */}
          {ad.notes.length === 0 ? (
            <p className="text-[13px] text-[#8a8d91] text-center py-6">No notes yet. Add feedback about creatives, ad copy, or general notes.</p>
          ) : (
            <div className="space-y-2">
              {ad.notes.map((n) => {
                const cfg = NOTE_TAG_CONFIG[n.tag];
                return (
                  <div key={n.id} className="bg-white rounded-lg p-3 border border-[#dadde1] group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full inline-block mb-1.5" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
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
        </div>
      </div>
    </div>
  );
}
