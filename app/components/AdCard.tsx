"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "../lib/supabase";

type AdData = {
  pageName: string;
  pageAvatar: string | null;
  bodyText: string;
  media: { url: string; type: "image" | "video" }[];
  ctaUrl: string;
  ctaLabel: string;
  headline: string;
  subheadline: string;
  width: number;
  height: number;
};

type AdType = "static" | "video" | "carousel";

const CTA_OPTIONS = [
  "Learn more",
  "Shop now",
  "Sign up",
  "Book now",
  "Contact us",
  "Download",
  "Get offer",
  "Get quote",
  "Subscribe",
  "Apply now",
  "Watch more",
  "Send message",
];

const DEFAULT_AD: AdData = {
  pageName: "Your Brand Name",
  pageAvatar: null,
  bodyText:
    "Discover something amazing today! Click below to learn more about our latest offerings.",
  media: [],
  ctaUrl: "https://example.com",
  ctaLabel: "Learn more",
  headline: "Your Headline Here",
  subheadline: "yourbrand.com",
  width: 500,
  height: 500,
};

export default function AdCard() {
  const [adType, setAdType] = useState<AdType>("static");
  const [ad, setAd] = useState<AdData>({ ...DEFAULT_AD });
  const [editingField, setEditingField] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [saved, setSaved] = useState(false);
  const [savedAds, setSavedAds] = useState<{ id: string; name: string; ad_type: string; created_at: string }[]>([]);
  const [currentAdId, setCurrentAdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSavedAds();
  }, []);

  const fetchSavedAds = async () => {
    const { data } = await supabase
      .from("ads")
      .select("id, name, ad_type, created_at")
      .order("created_at", { ascending: false });
    if (data) setSavedAds(data);
  };

  const updateAd = (updates: Partial<AdData>) => {
    setAd((prev) => ({ ...prev, ...updates }));
    setSaved(false);
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith("video/") ? "video" : "image";

      if (adType === "video" && type !== "video") return;
      if (adType === "static" && type !== "image") return;

      if (adType === "carousel") {
        updateAd({ media: [...ad.media, { url, type: "image" }] });
      } else {
        updateAd({ media: [{ url, type }] });
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

  const removeCarouselSlide = (index: number) => {
    const newMedia = ad.media.filter((_, i) => i !== index);
    updateAd({ media: newMedia });
    if (carouselIndex >= newMedia.length && newMedia.length > 0) {
      setCarouselIndex(newMedia.length - 1);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const row = {
      name: ad.pageName,
      ad_type: adType,
      page_name: ad.pageName,
      body_text: ad.bodyText,
      headline: ad.headline,
      subheadline: ad.subheadline,
      cta_label: ad.ctaLabel,
      cta_url: ad.ctaUrl,
      width: ad.width,
      height: ad.height,
    };

    if (currentAdId) {
      await supabase.from("ads").update(row).eq("id", currentAdId);
    } else {
      const { data } = await supabase.from("ads").insert(row).select("id").single();
      if (data) setCurrentAdId(data.id);
    }

    await fetchSavedAds();
    setSaved(true);
    setLoading(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLoad = async (id: string) => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").eq("id", id).single();
    if (data) {
      setCurrentAdId(data.id);
      setAdType(data.ad_type || "static");
      setAd({
        pageName: data.page_name || DEFAULT_AD.pageName,
        pageAvatar: null,
        bodyText: data.body_text || DEFAULT_AD.bodyText,
        media: [],
        ctaUrl: data.cta_url || DEFAULT_AD.ctaUrl,
        ctaLabel: data.cta_label || DEFAULT_AD.ctaLabel,
        headline: data.headline || DEFAULT_AD.headline,
        subheadline: data.subheadline || DEFAULT_AD.subheadline,
        width: data.width || DEFAULT_AD.width,
        height: data.height || DEFAULT_AD.height,
      });
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ads").delete().eq("id", id);
    if (currentAdId === id) {
      setCurrentAdId(null);
      setAd({ ...DEFAULT_AD });
      setAdType("static");
    }
    await fetchSavedAds();
  };

  const handleNewAd = () => {
    setCurrentAdId(null);
    setAd({ ...DEFAULT_AD });
    setAdType("static");
    setSaved(false);
  };

  const cardMaxWidth = adType === "carousel" ? 500 : Math.max(320, Math.min(ad.width, 700));

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full max-w-[1200px] mx-auto p-6">
      {/* Controls Panel */}
      <div className="md:w-[340px] shrink-0 space-y-5">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
          <h2 className="text-[15px] font-semibold mb-4 text-[#1c1e21]">Ad Type</h2>
          <div className="flex gap-2">
            {(["static", "video", "carousel"] as AdType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  setAdType(type);
                  updateAd({ media: [] });
                  setCarouselIndex(0);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-[13px] font-semibold capitalize transition-all ${
                  adType === type
                    ? "bg-[#e7f3ff] text-[#1877f2] border-2 border-[#1877f2]"
                    : "bg-[#f0f2f5] text-[#65676b] border-2 border-transparent hover:bg-[#e4e6eb]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
          <h2 className="text-[15px] font-semibold mb-4 text-[#1c1e21]">Page Info</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Page Name
              </label>
              <input
                type="text"
                value={ad.pageName}
                onChange={(e) => updateAd({ pageName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Avatar
              </label>
              <button
                onClick={() => avatarInputRef.current?.click()}
                className="text-[13px] text-[#1877f2] font-semibold hover:underline"
              >
                Upload avatar image
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
          <h2 className="text-[15px] font-semibold mb-4 text-[#1c1e21]">Ad Content</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Primary Text
              </label>
              <textarea
                value={ad.bodyText}
                onChange={(e) => updateAd({ bodyText: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] resize-none focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Headline
              </label>
              <input
                type="text"
                value={ad.headline}
                onChange={(e) => updateAd({ headline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Display Link
              </label>
              <input
                type="text"
                value={ad.subheadline}
                onChange={(e) => updateAd({ subheadline: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                CTA Button
              </label>
              <select
                value={ad.ctaLabel}
                onChange={(e) => updateAd({ ctaLabel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2] bg-white"
              >
                {CTA_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                Destination URL
              </label>
              <input
                type="text"
                value={ad.ctaUrl}
                onChange={(e) => updateAd({ ctaUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2] focus:ring-1 focus:ring-[#1877f2]"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
          <h2 className="text-[15px] font-semibold mb-4 text-[#1c1e21]">Media</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 rounded-lg bg-[#e7f3ff] text-[#1877f2] text-[13px] font-semibold hover:bg-[#d2e8ff] transition-colors"
          >
            {adType === "video" ? "Upload Video" : "Upload Image"}
            {adType === "carousel" ? "(s)" : ""}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={adType === "video" ? "video/*" : "image/*"}
            multiple={adType === "carousel"}
            onChange={handleMediaUpload}
            className="hidden"
          />
          {adType === "carousel" && ad.media.length > 0 && (
            <div className="mt-3 space-y-2">
              {ad.media.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-3 py-2 bg-[#f0f2f5] rounded-lg text-[13px]"
                >
                  <span className="text-[#65676b]">Slide {i + 1}</span>
                  <button
                    onClick={() => removeCarouselSlide(i)}
                    className="text-[#fa3e3e] font-semibold hover:underline text-[12px]"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {adType !== "carousel" && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
            <h2 className="text-[15px] font-semibold mb-4 text-[#1c1e21]">Dimensions</h2>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                  Width
                </label>
                <input
                  type="number"
                  value={ad.width}
                  onChange={(e) => updateAd({ width: parseInt(e.target.value) || 320 })}
                  min={320}
                  max={700}
                  className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2]"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[12px] font-semibold text-[#65676b] mb-1 uppercase tracking-wide">
                  Height
                </label>
                <input
                  type="number"
                  value={ad.height}
                  onChange={(e) => updateAd({ height: parseInt(e.target.value) || 320 })}
                  min={200}
                  max={700}
                  className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[14px] focus:outline-none focus:border-[#1877f2]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#8a8d91] mt-2">
              Aspect ratio: {ad.width}×{ad.height}px
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-[#1877f2] text-white text-[14px] font-semibold hover:bg-[#166fe5] transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : saved ? "✓ Saved!" : currentAdId ? "Update Ad" : "Save Ad"}
          </button>
          <button
            onClick={handleNewAd}
            className="flex-1 py-2.5 rounded-lg bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold hover:bg-[#d8dadf] transition-colors"
          >
            + New Ad
          </button>
        </div>

        {savedAds.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-[#dadde1]">
            <h2 className="text-[15px] font-semibold mb-3 text-[#1c1e21]">Saved Ads</h2>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {savedAds.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    currentAdId === item.id
                      ? "bg-[#e7f3ff] border border-[#1877f2]"
                      : "bg-[#f0f2f5] hover:bg-[#e4e6eb]"
                  }`}
                  onClick={() => handleLoad(item.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-semibold text-[#1c1e21] truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-[#65676b] capitalize">
                      {item.ad_type} · {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(item.id);
                    }}
                    className="ml-2 text-[12px] text-[#fa3e3e] font-semibold hover:underline shrink-0"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ad Preview */}
      <div className="flex-1 flex flex-col items-center">
        <h2 className="text-[13px] font-semibold text-[#65676b] uppercase tracking-wide mb-4">
          Ad Preview
        </h2>
        <div
          className="bg-white rounded-lg shadow-md border border-[#dadde1] overflow-hidden"
          style={{ width: cardMaxWidth, maxWidth: "100%" }}
        >
          {/* Page Header */}
          <div className="flex items-center gap-3 p-3 pb-0">
            <div
              className="w-10 h-10 rounded-full bg-[#e4e6eb] overflow-hidden shrink-0 flex items-center justify-center cursor-pointer"
              onClick={() => avatarInputRef.current?.click()}
            >
              {ad.pageAvatar ? (
                <img
                  src={ad.pageAvatar}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              {editingField === "pageName" ? (
                <input
                  autoFocus
                  value={ad.pageName}
                  onChange={(e) => updateAd({ pageName: e.target.value })}
                  onBlur={() => setEditingField(null)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                  className="text-[15px] font-semibold text-[#1c1e21] border-b-2 border-[#1877f2] outline-none bg-transparent w-full"
                />
              ) : (
                <div
                  className="text-[15px] font-semibold text-[#1c1e21] cursor-pointer hover:underline"
                  onClick={() => setEditingField("pageName")}
                >
                  {ad.pageName}
                </div>
              )}
              <div className="flex items-center gap-1 text-[13px] text-[#65676b]">
                <span>Sponsored</span>
                <span>·</span>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.5 8.5a.5.5 0 01-.5.5H8a.5.5 0 01-.5-.5V4a.5.5 0 011 0v4h3a.5.5 0 01.5.5z" />
                </svg>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
                <svg className="w-5 h-5 text-[#65676b]" fill="currentColor" viewBox="0 0 20 20">
                  <circle cx="10" cy="4" r="1.5" />
                  <circle cx="10" cy="10" r="1.5" />
                  <circle cx="10" cy="16" r="1.5" />
                </svg>
              </button>
              <button className="p-1.5 rounded-full hover:bg-[#f0f2f5]">
                <svg className="w-5 h-5 text-[#65676b]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body Text */}
          <div className="px-4 py-2">
            {editingField === "bodyText" ? (
              <textarea
                autoFocus
                value={ad.bodyText}
                onChange={(e) => updateAd({ bodyText: e.target.value })}
                onBlur={() => setEditingField(null)}
                rows={3}
                className="w-full text-[15px] text-[#1c1e21] leading-[20px] border-2 border-[#1877f2] rounded-lg p-2 outline-none resize-none"
              />
            ) : (
              <p
                className="text-[15px] text-[#1c1e21] leading-[20px] cursor-pointer hover:bg-[#f7f8fa] rounded px-1 -mx-1 transition-colors"
                onClick={() => setEditingField("bodyText")}
              >
                {ad.bodyText}
              </p>
            )}
          </div>

          {/* Media Area */}
          {adType === "carousel" ? (
            <CarouselMedia
              media={ad.media}
              index={carouselIndex}
              onIndexChange={setCarouselIndex}
              headline={ad.headline}
              subheadline={ad.subheadline}
              ctaLabel={ad.ctaLabel}
              ctaUrl={ad.ctaUrl}
              onUpload={() => fileInputRef.current?.click()}
              editingField={editingField}
              setEditingField={setEditingField}
              updateAd={updateAd}
            />
          ) : (
            <>
              <div
                className="bg-[#f0f2f5] flex items-center justify-center overflow-hidden relative"
                style={{
                  height: adType === "carousel" ? cardMaxWidth : ad.height,
                }}
              >
                {ad.media.length === 0 ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center gap-2 text-[#65676b] hover:text-[#1877f2] transition-colors"
                  >
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span className="text-[14px] font-semibold">
                      Upload {adType === "video" ? "Video" : "Image"}
                    </span>
                  </button>
                ) : adType === "video" ? (
                  <video
                    src={ad.media[0].url}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={ad.media[0].url}
                    alt="ad"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>

              {/* CTA Section */}
              <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
                <div className="min-w-0 flex-1 mr-3">
                  {editingField === "subheadline" ? (
                    <input
                      autoFocus
                      value={ad.subheadline}
                      onChange={(e) => updateAd({ subheadline: e.target.value })}
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                      className="text-[12px] text-[#65676b] uppercase border-b-2 border-[#1877f2] outline-none bg-transparent w-full"
                    />
                  ) : (
                    <div
                      className="text-[12px] text-[#65676b] uppercase truncate cursor-pointer hover:underline"
                      onClick={() => setEditingField("subheadline")}
                    >
                      {ad.subheadline}
                    </div>
                  )}
                  {editingField === "headline" ? (
                    <input
                      autoFocus
                      value={ad.headline}
                      onChange={(e) => updateAd({ headline: e.target.value })}
                      onBlur={() => setEditingField(null)}
                      onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                      className="text-[15px] font-semibold text-[#1c1e21] border-b-2 border-[#1877f2] outline-none bg-transparent w-full"
                    />
                  ) : (
                    <div
                      className="text-[15px] font-semibold text-[#1c1e21] truncate cursor-pointer hover:underline"
                      onClick={() => setEditingField("headline")}
                    >
                      {ad.headline}
                    </div>
                  )}
                </div>
                <a
                  href={ad.ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors"
                >
                  {ad.ctaLabel}
                </a>
              </div>
            </>
          )}

          {/* Engagement Bar */}
          <div className="px-4 py-1 border-t border-[#dadde1]">
            <div className="flex items-center justify-between py-1 text-[13px] text-[#65676b]">
              <div className="flex items-center gap-1">
                <div className="flex -space-x-1">
                  <span className="w-[18px] h-[18px] rounded-full bg-[#1877f2] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                  </span>
                  <span className="w-[18px] h-[18px] rounded-full bg-[#f0284a] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </span>
                </div>
                <span>142</span>
              </div>
              <span>23 comments · 8 shares</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex border-t border-[#dadde1] px-2">
            {[
              { label: "Like", icon: "M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" },
              { label: "Comment", icon: "M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7z" },
              { label: "Share", icon: "M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" },
            ].map(({ label, icon }) => (
              <button
                key={label}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5] rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d={icon} />
                </svg>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CarouselMedia({
  media,
  index,
  onIndexChange,
  headline,
  subheadline,
  ctaLabel,
  ctaUrl,
  onUpload,
  editingField,
  setEditingField,
  updateAd,
}: {
  media: AdData["media"];
  index: number;
  onIndexChange: (i: number) => void;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  ctaUrl: string;
  onUpload: () => void;
  editingField: string | null;
  setEditingField: (f: string | null) => void;
  updateAd: (u: Partial<AdData>) => void;
}) {
  const slides = media.length > 0 ? media : [null];
  const showNav = slides.length > 1;

  return (
    <div className="relative">
      <div className="flex overflow-hidden">
        {slides.map((slide, i) => (
          <div
            key={i}
            className="w-full shrink-0 transition-transform duration-300"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            <div className="aspect-square bg-[#f0f2f5] flex items-center justify-center overflow-hidden">
              {slide ? (
                <img src={slide.url} alt={`slide ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <button
                  onClick={onUpload}
                  className="flex flex-col items-center gap-2 text-[#65676b] hover:text-[#1877f2] transition-colors"
                >
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-[14px] font-semibold">Add Carousel Images</span>
                </button>
              )}
            </div>
            {/* Per-slide CTA section */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#f0f2f5] border-t border-[#dadde1]">
              <div className="min-w-0 flex-1 mr-3">
                {editingField === "subheadline" ? (
                  <input
                    autoFocus
                    value={subheadline}
                    onChange={(e) => updateAd({ subheadline: e.target.value })}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                    className="text-[12px] text-[#65676b] uppercase border-b-2 border-[#1877f2] outline-none bg-transparent w-full"
                  />
                ) : (
                  <div
                    className="text-[12px] text-[#65676b] uppercase truncate cursor-pointer hover:underline"
                    onClick={() => setEditingField("subheadline")}
                  >
                    {subheadline}
                  </div>
                )}
                {editingField === "headline" ? (
                  <input
                    autoFocus
                    value={headline}
                    onChange={(e) => updateAd({ headline: e.target.value })}
                    onBlur={() => setEditingField(null)}
                    onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
                    className="text-[15px] font-semibold text-[#1c1e21] border-b-2 border-[#1877f2] outline-none bg-transparent w-full"
                  />
                ) : (
                  <div
                    className="text-[15px] font-semibold text-[#1c1e21] truncate cursor-pointer hover:underline"
                    onClick={() => setEditingField("headline")}
                  >
                    {headline}
                  </div>
                )}
              </div>
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-4 py-2 bg-[#e4e6eb] text-[#1c1e21] text-[14px] font-semibold rounded-md hover:bg-[#d8dadf] transition-colors"
              >
                {ctaLabel}
              </a>
            </div>
          </div>
        ))}
      </div>

      {showNav && (
        <>
          <button
            onClick={() => onIndexChange(Math.max(0, index - 1))}
            className="absolute left-2 top-[45%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30"
            disabled={index === 0}
          >
            <svg className="w-4 h-4 text-[#1c1e21]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={() => onIndexChange(Math.min(slides.length - 1, index + 1))}
            className="absolute right-2 top-[45%] -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full shadow flex items-center justify-center hover:bg-white transition-colors disabled:opacity-30"
            disabled={index === slides.length - 1}
          >
            <svg className="w-4 h-4 text-[#1c1e21]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {showNav && (
        <div className="absolute bottom-[76px] left-1/2 -translate-x-1/2 flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => onIndexChange(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? "bg-[#1877f2]" : "bg-white/60"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
