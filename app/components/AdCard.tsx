"use client";

import { useState, useRef, useEffect } from "react";

type AdType = "static" | "video" | "carousel";
type Platform = "meta" | "google" | "tiktok" | "linkedin" | "x";

type AdData = {
  id: string;
  pageName: string;
  pageAvatar: string | null;
  bodyText: string;
  mediaUrls: string[];
  mediaType: "image" | "video";
  ctaUrl: string;
  ctaLabel: string;
  headline: string;
  subheadline: string;
  width: number;
  height: number;
  adType: AdType;
  platform: Platform;
  createdAt: string;
};

const CTA_OPTIONS = [
  "Learn more", "Shop now", "Sign up", "Book now", "Contact us",
  "Download", "Get offer", "Get quote", "Subscribe", "Apply now",
  "Watch more", "Send message",
];

const PLATFORM_CONFIG: Record<Platform, { label: string; color: string; bg: string }> = {
  meta: { label: "Meta", color: "#1877f2", bg: "#e7f3ff" },
  google: { label: "Google", color: "#4285f4", bg: "#e8f0fe" },
  tiktok: { label: "TikTok", color: "#010101", bg: "#f0f0f0" },
  linkedin: { label: "LinkedIn", color: "#0a66c2", bg: "#e1f0ff" },
  x: { label: "X", color: "#000000", bg: "#f0f0f0" },
};

const REACTIONS = [
  { emoji: "👍", label: "Like", bg: "#1877f2" },
  { emoji: "❤️", label: "Love", bg: "#f0284a" },
  { emoji: "😂", label: "Haha", bg: "#f7b928" },
  { emoji: "😮", label: "Wow", bg: "#f7b928" },
  { emoji: "😢", label: "Sad", bg: "#f7b928" },
  { emoji: "😡", label: "Angry", bg: "#e9710f" },
];

const SEE_MORE_LIMIT = 125;

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createDefaultAd(): AdData {
  return {
    id: generateId(),
    pageName: "Your Brand Name",
    pageAvatar: null,
    bodyText: "Discover something amazing today! Click below to learn more about our latest offerings.",
    mediaUrls: [],
    mediaType: "image",
    ctaUrl: "https://example.com",
    ctaLabel: "Learn more",
    headline: "Your Headline Here",
    subheadline: "yourbrand.com",
    width: 500,
    height: 500,
    adType: "static",
    platform: "meta",
    createdAt: new Date().toISOString(),
  };
}

function loadAds(): AdData[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("ads-simulator-ads");
  return raw ? JSON.parse(raw) : [];
}

function saveAdsToStorage(ads: AdData[]) {
  localStorage.setItem("ads-simulator-ads", JSON.stringify(ads));
}

export default function AdCard() {
  const [mainTab, setMainTab] = useState<"create" | "saved">("create");
  const [ad, setAd] = useState<AdData>(createDefaultAd);
  const [savedAds, setSavedAds] = useState<AdData[]>([]);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    type: true, page: false, content: false, media: false, cta: false, dimensions: false,
  });
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Preview interactive state
  const [selectedReaction, setSelectedReaction] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSavedAds(loadAds());
  }, []);

  const updateAd = (updates: Partial<AdData>) => {
    setAd((prev) => ({ ...prev, ...updates }));
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith("video/");
      if (ad.adType === "video" && !isVideo) return;
      if (ad.adType === "static" && isVideo) return;
      if (ad.adType === "carousel") {
        updateAd({ mediaUrls: [...ad.mediaUrls, url], mediaType: "image" });
      } else {
        updateAd({ mediaUrls: [url], mediaType: isVideo ? "video" : "image" });
      }
    });
    e.target.value = "";
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateAd({ pageAvatar: URL.createObjectURL(file) });
    e.target.value = "";
  };

  const removeSlide = (i: number) => {
    const next = ad.mediaUrls.filter((_, idx) => idx !== i);
    updateAd({ mediaUrls: next });
    if (carouselIndex >= next.length && next.length > 0) setCarouselIndex(next.length - 1);
  };

  const handleSave = () => {
    setSaveStatus("saving");
    const existing = loadAds();
    const idx = existing.findIndex((a) => a.id === ad.id);
    const toSave = { ...ad, createdAt: idx >= 0 ? ad.createdAt : new Date().toISOString() };
    if (idx >= 0) {
      existing[idx] = toSave;
    } else {
      existing.unshift(toSave);
    }
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
    if (editingId === id) {
      setAd(createDefaultAd());
      setEditingId(null);
    }
  };

  const handleLoadAd = (savedAd: AdData) => {
    setAd({ ...savedAd });
    setEditingId(savedAd.id);
    setMainTab("create");
    setCarouselIndex(0);
    resetPreviewState();
  };

  const handleNewAd = () => {
    setAd(createDefaultAd());
    setEditingId(null);
    setCarouselIndex(0);
    resetPreviewState();
  };

  const resetPreviewState = () => {
    setSelectedReaction(null);
    setShowFullText(false);
    setShowComments(false);
    setComments([]);
    setCommentText("");
  };

  const handleShare = () => {
    const text = `Check out this ad from ${ad.pageName}: ${ad.headline}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    setComments((prev) => [...prev, commentText.trim()]);
    setCommentText("");
  };

  const cardMaxWidth = ad.adType === "carousel" ? 500 : Math.max(320, Math.min(ad.width, 700));
  const platformCfg = PLATFORM_CONFIG[ad.platform];

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
          <div className="flex bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setMainTab("create")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                mainTab === "create" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"
              }`}
            >
              Create Ad
            </button>
            <button
              onClick={() => setMainTab("saved")}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-all ${
                mainTab === "saved" ? "bg-white text-[#1877f2]" : "text-white/80 hover:text-white"
              }`}
            >
              Saved Ad Samples {savedAds.length > 0 && `(${savedAds.length})`}
            </button>
          </div>
        </div>
      </header>

      {mainTab === "saved" ? (
        <SavedAdsTab ads={savedAds} onLoad={handleLoadAd} onDelete={handleDelete} />
      ) : (
        <div className="flex flex-col md:flex-row gap-6 max-w-[1400px] mx-auto p-4 pt-6">
          {/* Left Panel - Accordion Controls */}
          <div className="md:w-[320px] shrink-0 space-y-2">
            {/* Action buttons */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-lg bg-[#1877f2] text-white text-[13px] font-semibold hover:bg-[#166fe5] transition-colors"
              >
                {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : editingId ? "Update Ad" : "Save Ad"}
              </button>
              <button
                onClick={handleNewAd}
                className="flex-1 py-2.5 rounded-lg bg-white text-[#1c1e21] text-[13px] font-semibold hover:bg-[#f0f2f5] transition-colors border border-[#dadde1]"
              >
                + New Ad
              </button>
            </div>

            <AccordionSection title="Ad Type & Platform" isOpen={openSections.type} onToggle={() => toggleSection("type")}>
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1.5 uppercase tracking-wide">Format</label>
                  <div className="flex gap-1.5">
                    {(["static", "video", "carousel"] as AdType[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => { updateAd({ adType: type, mediaUrls: [] }); setCarouselIndex(0); }}
                        className={`flex-1 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all ${
                          ad.adType === type ? "bg-[#1877f2] text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1.5 uppercase tracking-wide">Platform</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(PLATFORM_CONFIG) as Platform[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => updateAd({ platform: p })}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                          ad.platform === p
                            ? `text-white`
                            : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"
                        }`}
                        style={ad.platform === p ? { backgroundColor: PLATFORM_CONFIG[p].color } : undefined}
                      >
                        {PLATFORM_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Page Info" isOpen={openSections.page} onToggle={() => toggleSection("page")}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Page Name</label>
                  <input type="text" value={ad.pageName} onChange={(e) => updateAd({ pageName: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Avatar</label>
                  <button onClick={() => avatarInputRef.current?.click()}
                    className="text-[12px] text-[#1877f2] font-semibold hover:underline">
                    {ad.pageAvatar ? "Change avatar" : "Upload avatar"}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Ad Content" isOpen={openSections.content} onToggle={() => toggleSection("content")}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Primary Text</label>
                  <textarea value={ad.bodyText} onChange={(e) => updateAd({ bodyText: e.target.value })} rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] resize-none focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Headline</label>
                  <input type="text" value={ad.headline} onChange={(e) => updateAd({ headline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Display Link</label>
                  <input type="text" value={ad.subheadline} onChange={(e) => updateAd({ subheadline: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Media" isOpen={openSections.media} onToggle={() => toggleSection("media")}>
              <div className="space-y-2.5">
                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 rounded-lg bg-[#e7f3ff] text-[#1877f2] text-[12px] font-semibold hover:bg-[#d2e8ff] transition-colors">
                  {ad.adType === "video" ? "Upload Video" : `Upload Image${ad.adType === "carousel" ? "(s)" : ""}`}
                </button>
                <input ref={fileInputRef} type="file"
                  accept={ad.adType === "video" ? "video/*" : "image/*"}
                  multiple={ad.adType === "carousel"} onChange={handleMediaUpload} className="hidden" />
                {ad.adType === "carousel" && ad.mediaUrls.length > 0 && (
                  <div className="space-y-1">
                    {ad.mediaUrls.map((_, i) => (
                      <div key={i} className="flex items-center justify-between px-2.5 py-1.5 bg-[#f0f2f5] rounded-md text-[12px]">
                        <span className="text-[#65676b]">Slide {i + 1}</span>
                        <button onClick={() => removeSlide(i)} className="text-[#fa3e3e] font-semibold text-[11px]">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </AccordionSection>

            <AccordionSection title="CTA Button" isOpen={openSections.cta} onToggle={() => toggleSection("cta")}>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Button Text</label>
                  <select value={ad.ctaLabel} onChange={(e) => updateAd({ ctaLabel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] bg-white">
                    {CTA_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">Destination URL</label>
                  <input type="text" value={ad.ctaUrl} onChange={(e) => updateAd({ ctaUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]" />
                </div>
              </div>
            </AccordionSection>

            {ad.adType !== "carousel" && (
              <AccordionSection title="Dimensions" isOpen={openSections.dimensions} onToggle={() => toggleSection("dimensions")}>
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
              </AccordionSection>
            )}
          </div>

          {/* Right Panel - Ad Preview (read-only interactive) */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[12px] font-semibold text-[#65676b] uppercase tracking-wide">Ad Preview</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: platformCfg.bg, color: platformCfg.color }}>
                {platformCfg.label}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f0f2f5] text-[#65676b] capitalize">{ad.adType}</span>
            </div>

            <div className="bg-white rounded-lg shadow-lg border border-[#dadde1] overflow-hidden" style={{ width: cardMaxWidth, maxWidth: "100%" }}>
              {/* Page Header */}
              <div className="flex items-center gap-2.5 p-3 pb-1">
                <div className="w-10 h-10 rounded-full bg-[#e4e6eb] overflow-hidden shrink-0 flex items-center justify-center">
                  {ad.pageAvatar ? (
                    <img src={ad.pageAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold text-[#1c1e21]">{ad.pageName}</div>
                  <div className="flex items-center gap-1 text-[13px] text-[#65676b]">
                    <span>Sponsored</span>
                    <span>·</span>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 8.5a.5.5 0 01-.5.5H8a.5.5 0 01-.5-.5V4a.5.5 0 011 0v4h3a.5.5 0 01.5.5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-0.5">
                  <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
                    <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                      <circle cx="10" cy="4" r="1.5" /><circle cx="10" cy="10" r="1.5" /><circle cx="10" cy="16" r="1.5" />
                    </svg>
                  </button>
                  <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
                    <svg className="w-5 h-5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body Text with See More */}
              <div className="px-4 py-1.5">
                {ad.bodyText.length > SEE_MORE_LIMIT && !showFullText ? (
                  <p className="text-[15px] text-[#1c1e21] leading-[20px]">
                    {ad.bodyText.slice(0, SEE_MORE_LIMIT)}...{" "}
                    <button onClick={() => setShowFullText(true)} className="text-[#65676b] font-semibold hover:underline">
                      See more
                    </button>
                  </p>
                ) : (
                  <p className="text-[15px] text-[#1c1e21] leading-[20px] whitespace-pre-wrap">{ad.bodyText}</p>
                )}
              </div>

              {/* Media */}
              {ad.adType === "carousel" ? (
                <CarouselPreview media={ad.mediaUrls} index={carouselIndex} onIndexChange={setCarouselIndex}
                  headline={ad.headline} subheadline={ad.subheadline} ctaLabel={ad.ctaLabel} ctaUrl={ad.ctaUrl} />
              ) : (
                <>
                  <div className="bg-[#f0f2f5] flex items-center justify-center overflow-hidden" style={{ height: ad.mediaUrls.length > 0 ? ad.height : 300 }}>
                    {ad.mediaUrls.length === 0 ? (
                      <div className="text-[#8a8d91] text-[14px] flex flex-col items-center gap-2">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                        <span>No media uploaded</span>
                      </div>
                    ) : ad.mediaType === "video" ? (
                      <video src={ad.mediaUrls[0]} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="text-[12px] text-[#65676b] uppercase truncate">{ad.subheadline}</div>
                      <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{ad.headline}</div>
                    </div>
                    <a href={ad.ctaUrl} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors">
                      {ad.ctaLabel}
                    </a>
                  </div>
                </>
              )}

              {/* Reactions & Engagement Count */}
              <div className="px-4 py-1 border-t border-[#dadde1]">
                <div className="flex items-center justify-between py-1 text-[13px] text-[#65676b]">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                      <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center z-10"><span className="text-[10px]">👍</span></span>
                      <span className="w-[18px] h-[18px] rounded-full bg-[#f0284a] flex items-center justify-center"><span className="text-[10px]">❤️</span></span>
                    </div>
                    <span>{selectedReaction ? 143 : 142}</span>
                  </div>
                  <span>{comments.length + 23} comments · 8 shares</span>
                </div>
              </div>

              {/* Action Buttons with Reaction Picker */}
              <div className="flex border-t border-[#dadde1] px-2 relative">
                <div className="flex-1 relative"
                  onMouseEnter={() => setShowReactionPicker(true)}
                  onMouseLeave={() => setShowReactionPicker(false)}>
                  {showReactionPicker && (
                    <div className="absolute bottom-full left-0 mb-1 bg-white rounded-full shadow-lg border border-[#dadde1] px-2 py-1.5 flex gap-1 z-20">
                      {REACTIONS.map((r) => (
                        <button key={r.label} onClick={() => { setSelectedReaction(selectedReaction === r.emoji ? null : r.emoji); setShowReactionPicker(false); }}
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:scale-125 hover:bg-[#f0f2f5] transition-transform text-[20px]"
                          title={r.label}>
                          {r.emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedReaction(selectedReaction ? null : "👍")}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 text-[14px] font-semibold rounded-md transition-colors ${
                      selectedReaction ? "text-[#1877f2]" : "text-[#65676b] hover:bg-[#f0f2f5]"
                    }`}>
                    <span className="text-[18px]">{selectedReaction || "👍"}</span>
                    {selectedReaction ? REACTIONS.find((r) => r.emoji === selectedReaction)?.label || "Like" : "Like"}
                  </button>
                </div>
                <button onClick={() => setShowComments(!showComments)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5] rounded-md transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" />
                  </svg>
                  Comment
                </button>
                <button onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5] rounded-md transition-colors">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                  {copied ? "Copied!" : "Share"}
                </button>
              </div>

              {/* Comments Section */}
              {showComments && (
                <div className="border-t border-[#dadde1] px-4 py-3 space-y-3">
                  {comments.map((c, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="w-8 h-8 rounded-full bg-[#e4e6eb] shrink-0 flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                        </svg>
                      </div>
                      <div className="bg-[#f0f2f5] rounded-2xl px-3 py-2">
                        <div className="text-[13px] font-semibold text-[#1c1e21]">You</div>
                        <div className="text-[13px] text-[#1c1e21]">{c}</div>
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#e4e6eb] shrink-0 flex items-center justify-center">
                      <svg className="w-4 h-4 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    </div>
                    <div className="flex-1 flex bg-[#f0f2f5] rounded-full overflow-hidden">
                      <input type="text" value={commentText} onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addComment()}
                        placeholder="Write a comment..."
                        className="flex-1 px-4 py-2 bg-transparent text-[13px] outline-none" />
                      <button onClick={addComment} className="px-3 text-[#1877f2] font-semibold text-[13px] hover:bg-[#e4e6eb] transition-colors">
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccordionSection({ title, isOpen, onToggle, children }: {
  title: string; isOpen: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-[#dadde1] overflow-hidden">
      <button onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-[14px] font-semibold text-[#1c1e21] hover:bg-[#f7f8fa] transition-colors">
        {title}
        <svg className={`w-4 h-4 text-[#65676b] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function CarouselPreview({ media, index, onIndexChange, headline, subheadline, ctaLabel, ctaUrl }: {
  media: string[]; index: number; onIndexChange: (i: number) => void;
  headline: string; subheadline: string; ctaLabel: string; ctaUrl: string;
}) {
  const slides = media.length > 0 ? media : [null];
  const showNav = slides.length > 1;

  return (
    <div className="relative">
      <div className="flex overflow-hidden">
        {slides.map((url, i) => (
          <div key={i} className="w-full shrink-0 transition-transform duration-300" style={{ transform: `translateX(-${index * 100}%)` }}>
            <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
              {url ? (
                <img src={url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-[#8a8d91] text-[14px] flex flex-col items-center gap-2">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                  <span>No media</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
              <div className="min-w-0 flex-1 mr-3">
                <div className="text-[12px] text-[#65676b] uppercase truncate">{subheadline}</div>
                <div className="text-[15px] font-semibold text-[#1c1e21] truncate">{headline}</div>
              </div>
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors">
                {ctaLabel}
              </a>
            </div>
          </div>
        ))}
      </div>
      {showNav && (
        <>
          <button onClick={() => onIndexChange(Math.max(0, index - 1))}
            className="absolute left-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
            disabled={index === 0}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={() => onIndexChange(Math.min(slides.length - 1, index + 1))}
            className="absolute right-2 top-[40%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white disabled:opacity-30"
            disabled={index === slides.length - 1}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <div className="absolute bottom-[76px] left-1/2 -translate-x-1/2 flex gap-1.5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => onIndexChange(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-[#1877f2]" : "bg-white/60"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SavedAdsTab({ ads, onLoad, onDelete }: {
  ads: AdData[]; onLoad: (ad: AdData) => void; onDelete: (id: string) => void;
}) {
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
          return (
            <div key={ad.id} className="bg-white rounded-xl shadow-sm border border-[#dadde1] overflow-hidden hover:shadow-md transition-shadow">
              {/* Card thumbnail */}
              <div className="aspect-video bg-[#f0f2f5] flex items-center justify-center overflow-hidden relative">
                {ad.mediaUrls.length > 0 ? (
                  ad.mediaType === "video" ? (
                    <video src={ad.mediaUrls[0]} className="w-full h-full object-cover" />
                  ) : (
                    <img src={ad.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                  )
                ) : (
                  <svg className="w-12 h-12 text-[#dadde1]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                  </svg>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: pCfg.color }}>
                    {pCfg.label}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/50 text-white capitalize">{ad.adType}</span>
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-full bg-[#e4e6eb] overflow-hidden shrink-0 flex items-center justify-center">
                    {ad.pageAvatar ? (
                      <img src={ad.pageAvatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-3 h-3 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                      </svg>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1c1e21] truncate">{ad.pageName}</span>
                </div>
                <p className="text-[12px] text-[#65676b] line-clamp-2 mb-2">{ad.bodyText}</p>
                <div className="text-[14px] font-semibold text-[#1c1e21] truncate mb-1">{ad.headline}</div>
                <div className="text-[10px] text-[#8a8d91]">{new Date(ad.createdAt).toLocaleDateString()}</div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => onLoad(ad)}
                    className="flex-1 py-1.5 rounded-md bg-[#1877f2] text-white text-[12px] font-semibold hover:bg-[#166fe5] transition-colors">
                    Edit
                  </button>
                  <button onClick={() => onDelete(ad.id)}
                    className="py-1.5 px-3 rounded-md bg-[#ffebe9] text-[#d1242f] text-[12px] font-semibold hover:bg-[#ffd4d0] transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
