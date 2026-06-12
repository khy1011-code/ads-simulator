"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const STRATEGY_TIPS: Record<string, string[]> = {
  budget: [
    "Start with a daily budget of $5-10 per ad set for testing. Scale winners by 20-30% every 3 days.",
    "Allocate 70% of budget to proven campaigns and 30% to testing new audiences/creatives.",
    "Use Campaign Budget Optimization (CBO) to let Meta distribute budget across your best-performing ad sets.",
  ],
  audience: [
    "Layer interests with demographics for precise targeting. Use Lookalike Audiences from your best customers (1-3% similarity).",
    "Create separate ad sets for cold (prospecting) and warm (retargeting) audiences to control spending.",
    "Test broad targeting with strong creative — Meta's algorithm often finds better audiences than manual targeting.",
  ],
  creative: [
    "Test 3-5 creative variations per ad set. Include different hooks, visuals, and CTAs.",
    "Video ads under 15 seconds with captions perform best. Hook viewers in the first 3 seconds.",
    "Use UGC-style content for lower funnel campaigns — it feels authentic and drives higher CTR.",
  ],
  funnel: [
    "Structure your funnel: Awareness (video views) → Consideration (engagement/traffic) → Conversion (purchases/leads).",
    "Retarget video viewers at 50%+ watch time — they've shown real interest.",
    "Set up a 7-day and 30-day retargeting window for website visitors with different messaging.",
  ],
  copy: [
    "Lead with the problem, then present your solution. Use social proof (numbers, testimonials) early.",
    "Keep primary text under 125 characters for mobile — or use a strong hook before the 'See more' cut.",
    "Test emotional vs. logical angles. B2C often responds to emotion; B2B to data and ROI.",
  ],
  landing: [
    "Match your landing page headline to your ad headline for message consistency — it improves Quality Score.",
    "Keep forms short (3-5 fields max). Every extra field reduces conversions by ~10%.",
    "Add trust signals: logos, testimonials, security badges. Place them near your CTA button.",
  ],
  default: [
    "I can help with ad strategy! Ask me about budgets, audiences, creative approaches, funnel structure, ad copy, or landing pages.",
    "Try asking specific questions like 'How should I structure my retargeting funnel?' or 'What's the best budget split for testing?'",
    "Need help with your strategy board? I can suggest frameworks for campaign planning, audience segmentation, or creative testing.",
  ],
};

function getAiResponse(message: string): string {
  const lower = message.toLowerCase();
  let category = "default";
  if (/budget|spend|cost|money|cbo|roas|roi/i.test(lower)) category = "budget";
  else if (/audience|target|lookalike|retarget|demographic|interest/i.test(lower)) category = "audience";
  else if (/creative|video|image|ugc|visual|design|banner/i.test(lower)) category = "creative";
  else if (/funnel|awareness|consideration|conversion|journey|pipeline/i.test(lower)) category = "funnel";
  else if (/copy|text|headline|hook|caption|writing|cta/i.test(lower)) category = "copy";
  else if (/landing|page|form|website|lp/i.test(lower)) category = "landing";

  const tips = STRATEGY_TIPS[category];
  return tips[Math.floor(Math.random() * tips.length)];
}

export default function AiChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", role: "assistant", text: "Hi! I'm your Ad Strategy AI assistant. Ask me anything about ad strategy, targeting, budgets, creatives, funnels, or landing pages. I'll give you actionable recommendations!", timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isTyping) return;
    const userMsg: Message = { id: uid(), role: "user", text: input.trim(), timestamp: new Date().toISOString() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = getAiResponse(userMsg.text);
      const aiMsg: Message = { id: uid(), role: "assistant", text: response, timestamp: new Date().toISOString() };
      setMessages((p) => [...p, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 1200);
  };

  return (
    <div className="w-[320px] border-l border-[#dadde1] bg-white flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#dadde1] bg-gradient-to-r from-[#1877f2] to-[#42b72a]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white">AI Strategy Advisor</h3>
            <p className="text-[10px] text-white/70">Ask about your ad strategy</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 ${msg.role === "user" ? "bg-[#1877f2] text-white" : "bg-[#f0f2f5] text-[#1c1e21]"}`}>
              <p className="text-[13px] leading-[18px] whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-[9px] mt-1 ${msg.role === "user" ? "text-white/50" : "text-[#8a8d91]"}`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[#f0f2f5] rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-[#8a8d91] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick suggestions */}
      <div className="px-3 pb-2 flex flex-wrap gap-1">
        {["Budget tips", "Audience targeting", "Creative ideas", "Funnel strategy"].map((s) => (
          <button key={s} onClick={() => { setInput(s); }}
            className="px-2.5 py-1 rounded-full bg-[#e7f3ff] text-[#1877f2] text-[10px] font-semibold hover:bg-[#d2e8ff] transition-colors">
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[#dadde1] px-3 py-2">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about your strategy..."
            className="flex-1 px-3 py-2 rounded-full bg-[#f0f2f5] text-[13px] outline-none focus:ring-2 focus:ring-[#1877f2]" />
          <button onClick={sendMessage} disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-full bg-[#1877f2] text-white flex items-center justify-center hover:bg-[#166fe5] disabled:opacity-40 transition-colors shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
