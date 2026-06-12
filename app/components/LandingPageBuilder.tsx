"use client";

import { useState, useEffect } from "react";

type ElementType = "headline" | "subheadline" | "body" | "button" | "image" | "form" | "spacer";

interface PageElement {
  id: string;
  type: ElementType;
  content: string;
  style?: Record<string, string>;
}

interface FormField {
  id: string;
  label: string;
  type: "text" | "email" | "phone" | "select" | "textarea";
  placeholder: string;
  required: boolean;
  options?: string[];
}

interface FormPage {
  id: string;
  title: string;
  fields: FormField[];
}

interface LandingPage {
  id: string;
  name: string;
  template: string;
  elements: PageElement[];
  formPages: FormPage[];
  buttonColor: string;
  createdAt: string;
}

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const TEMPLATES = [
  { id: "hero-center", name: "Centered Hero", desc: "Hero image with centered text and CTA", preview: "center" },
  { id: "hero-left", name: "Split Left", desc: "Content on left, image on right", preview: "left" },
  { id: "form-right", name: "Form Right", desc: "Content on left, lead form on right", preview: "form" },
  { id: "long-scroll", name: "Long Scroll", desc: "Multi-section scrolling page", preview: "scroll" },
];

function createDefaultPage(templateId: string): LandingPage {
  const elements: PageElement[] = [
    { id: uid(), type: "headline", content: "Your Amazing Product" },
    { id: uid(), type: "subheadline", content: "The perfect solution for your needs" },
    { id: uid(), type: "body", content: "Discover why thousands of customers trust us. Our product delivers results that matter, with features designed for real people." },
    { id: uid(), type: "button", content: "Get Started" },
  ];
  if (templateId === "long-scroll") {
    elements.push(
      { id: uid(), type: "spacer", content: "" },
      { id: uid(), type: "headline", content: "Why Choose Us?" },
      { id: uid(), type: "body", content: "We provide the best tools and support to help you succeed. Our team is dedicated to your growth." },
      { id: uid(), type: "button", content: "Learn More" },
    );
  }
  return {
    id: uid(),
    name: `Landing Page ${Date.now() % 1000}`,
    template: templateId,
    elements,
    formPages: [
      {
        id: uid(), title: "Get Started", fields: [
          { id: uid(), label: "Full Name", type: "text", placeholder: "John Doe", required: true },
          { id: uid(), label: "Email", type: "email", placeholder: "john@example.com", required: true },
          { id: uid(), label: "Phone", type: "phone", placeholder: "+1 (555) 000-0000", required: false },
        ],
      },
    ],
    buttonColor: "#1877f2",
    createdAt: new Date().toISOString(),
  };
}

function loadPages(): LandingPage[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("ads-sim-landing-pages");
  return raw ? JSON.parse(raw) : [];
}
function savePages(pages: LandingPage[]) {
  localStorage.setItem("ads-sim-landing-pages", JSON.stringify(pages));
}

export default function LandingPageBuilder() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingEl, setEditingEl] = useState<string | null>(null);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [activeFormPage, setActiveFormPage] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const loaded = loadPages();
    setPages(loaded);
    if (loaded.length > 0) setActivePageId(loaded[0].id);
  }, []);

  const activePage = pages.find((p) => p.id === activePageId) || null;

  const persist = (updated: LandingPage[]) => { setPages(updated); savePages(updated); };

  const updatePage = (patch: Partial<LandingPage>) => {
    if (!activePageId) return;
    persist(pages.map((p) => p.id === activePageId ? { ...p, ...patch } : p));
  };

  const updateElement = (elId: string, content: string) => {
    if (!activePage) return;
    updatePage({ elements: activePage.elements.map((e) => e.id === elId ? { ...e, content } : e) });
  };

  const addElement = (type: ElementType) => {
    if (!activePage) return;
    const defaults: Record<ElementType, string> = {
      headline: "New Headline",
      subheadline: "New Subheadline",
      body: "Add your content here...",
      button: "Click Here",
      image: "",
      form: "",
      spacer: "",
    };
    updatePage({ elements: [...activePage.elements, { id: uid(), type, content: defaults[type] }] });
  };

  const removeElement = (elId: string) => {
    if (!activePage) return;
    updatePage({ elements: activePage.elements.filter((e) => e.id !== elId) });
  };

  const moveElement = (elId: string, dir: -1 | 1) => {
    if (!activePage) return;
    const idx = activePage.elements.findIndex((e) => e.id === elId);
    if (idx < 0) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= activePage.elements.length) return;
    const els = [...activePage.elements];
    [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
    updatePage({ elements: els });
  };

  const createPage = (templateId: string) => {
    const page = createDefaultPage(templateId);
    const updated = [...pages, page];
    persist(updated);
    setActivePageId(page.id);
    setShowTemplates(false);
  };

  const deletePage = (id: string) => {
    const updated = pages.filter((p) => p.id !== id);
    persist(updated);
    if (activePageId === id) setActivePageId(updated[0]?.id || null);
  };

  // Form editor helpers
  const addFormPage = () => {
    if (!activePage) return;
    const newFP: FormPage = { id: uid(), title: `Step ${activePage.formPages.length + 1}`, fields: [] };
    updatePage({ formPages: [...activePage.formPages, newFP] });
    setActiveFormPage(activePage.formPages.length);
  };

  const addFormField = (pageIdx: number) => {
    if (!activePage) return;
    const field: FormField = { id: uid(), label: "New Field", type: "text", placeholder: "Enter value...", required: false };
    const fps = [...activePage.formPages];
    fps[pageIdx] = { ...fps[pageIdx], fields: [...fps[pageIdx].fields, field] };
    updatePage({ formPages: fps });
  };

  const updateFormField = (pageIdx: number, fieldId: string, patch: Partial<FormField>) => {
    if (!activePage) return;
    const fps = [...activePage.formPages];
    fps[pageIdx] = { ...fps[pageIdx], fields: fps[pageIdx].fields.map((f) => f.id === fieldId ? { ...f, ...patch } : f) };
    updatePage({ formPages: fps });
  };

  const removeFormField = (pageIdx: number, fieldId: string) => {
    if (!activePage) return;
    const fps = [...activePage.formPages];
    fps[pageIdx] = { ...fps[pageIdx], fields: fps[pageIdx].fields.filter((f) => f.id !== fieldId) };
    updatePage({ formPages: fps });
  };

  const removeFormPage = (idx: number) => {
    if (!activePage || activePage.formPages.length <= 1) return;
    const fps = activePage.formPages.filter((_, i) => i !== idx);
    updatePage({ formPages: fps });
    if (activeFormPage >= fps.length) setActiveFormPage(fps.length - 1);
  };

  // Template selector
  if (showTemplates || (!activePage && pages.length === 0)) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#f7f8fa] flex items-center justify-center">
        <div className="max-w-[800px] w-full px-4">
          <h2 className="text-[24px] font-bold text-[#1c1e21] text-center mb-2">Choose a Template</h2>
          <p className="text-[14px] text-[#65676b] text-center mb-8">Select a layout to start building your landing page</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TEMPLATES.map((t) => (
              <button key={t.id} onClick={() => createPage(t.id)}
                className="bg-white rounded-xl border-2 border-[#dadde1] hover:border-[#1877f2] transition-colors p-4 text-left group">
                {/* Mini preview */}
                <div className="aspect-[3/4] bg-[#f0f2f5] rounded-lg mb-3 overflow-hidden flex flex-col p-2">
                  {t.preview === "center" && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
                      <div className="w-16 h-8 bg-[#dadde1] rounded" />
                      <div className="w-12 h-2 bg-[#e4e6eb] rounded" />
                      <div className="w-20 h-2 bg-[#e4e6eb] rounded" />
                      <div className="w-10 h-4 bg-[#1877f2] rounded mt-1" />
                    </div>
                  )}
                  {t.preview === "left" && (
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="w-full h-2.5 bg-[#dadde1] rounded" />
                        <div className="w-3/4 h-2 bg-[#e4e6eb] rounded" />
                        <div className="w-8 h-3.5 bg-[#1877f2] rounded mt-1" />
                      </div>
                      <div className="flex-1 bg-[#dadde1] rounded" />
                    </div>
                  )}
                  {t.preview === "form" && (
                    <div className="flex-1 flex gap-2">
                      <div className="flex-1 flex flex-col justify-center gap-1.5">
                        <div className="w-full h-2.5 bg-[#dadde1] rounded" />
                        <div className="w-3/4 h-2 bg-[#e4e6eb] rounded" />
                      </div>
                      <div className="flex-1 bg-white border border-[#dadde1] rounded p-1 flex flex-col gap-1">
                        <div className="w-full h-2 bg-[#f0f2f5] rounded" />
                        <div className="w-full h-2 bg-[#f0f2f5] rounded" />
                        <div className="w-full h-3 bg-[#1877f2] rounded" />
                      </div>
                    </div>
                  )}
                  {t.preview === "scroll" && (
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex-1 bg-[#dadde1] rounded flex items-center justify-center">
                        <div className="w-10 h-2 bg-white/50 rounded" />
                      </div>
                      <div className="flex-1 flex flex-col items-center justify-center gap-1">
                        <div className="w-12 h-2 bg-[#dadde1] rounded" />
                        <div className="w-16 h-1.5 bg-[#e4e6eb] rounded" />
                      </div>
                      <div className="flex-1 bg-[#e4e6eb] rounded" />
                    </div>
                  )}
                </div>
                <h3 className="text-[14px] font-semibold text-[#1c1e21] group-hover:text-[#1877f2]">{t.name}</h3>
                <p className="text-[11px] text-[#65676b] mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
          {pages.length > 0 && (
            <button onClick={() => setShowTemplates(false)}
              className="mt-4 mx-auto block text-[13px] text-[#65676b] hover:text-[#1877f2]">Cancel</button>
          )}
        </div>
      </div>
    );
  }

  if (!activePage) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#f7f8fa] flex items-center justify-center">
        <button onClick={() => setShowTemplates(true)} className="px-6 py-3 rounded-lg bg-[#1877f2] text-white font-semibold hover:bg-[#166fe5]">
          Create Landing Page
        </button>
      </div>
    );
  }

  const isFormTemplate = activePage.template === "form-right";
  const isSplit = activePage.template === "hero-left" || isFormTemplate;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {/* Page tabs */}
      <div className="bg-white border-b border-[#dadde1] px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {pages.map((p) => (
          <div key={p.id} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-semibold cursor-pointer shrink-0 ${p.id === activePageId ? "bg-[#e7f3ff] text-[#1877f2]" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
            <button onClick={() => { setActivePageId(p.id); setPreviewMode(false); }} className="truncate max-w-[120px]">{p.name}</button>
            <button onClick={() => deletePage(p.id)} className="ml-1 text-[#fa3e3e] hover:opacity-70 text-[10px]">&times;</button>
          </div>
        ))}
        <button onClick={() => setShowTemplates(true)} className="px-3 py-1.5 rounded-lg bg-[#1877f2] text-white text-[12px] font-semibold hover:bg-[#166fe5] shrink-0">+ New Page</button>
        <div className="ml-auto flex gap-2 shrink-0">
          <button onClick={() => setShowFormEditor(!showFormEditor)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${showFormEditor ? "bg-[#e7f3ff] text-[#1877f2]" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
            Form Editor
          </button>
          <button onClick={() => setPreviewMode(!previewMode)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${previewMode ? "bg-[#42b72a] text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
            {previewMode ? "Editing" : "Preview"}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Element palette (edit mode only) */}
        {!previewMode && !showFormEditor && (
          <div className="w-[180px] bg-white border-r border-[#dadde1] p-3 space-y-2 shrink-0 overflow-y-auto">
            <h4 className="text-[11px] font-bold text-[#65676b] uppercase tracking-wide mb-2">Add Elements</h4>
            {([
              { type: "headline" as const, label: "Headline", icon: "H" },
              { type: "subheadline" as const, label: "Subheadline", icon: "h" },
              { type: "body" as const, label: "Body Text", icon: "T" },
              { type: "button" as const, label: "Button", icon: "B" },
              { type: "spacer" as const, label: "Spacer", icon: "—" },
            ]).map((item) => (
              <button key={item.type} onClick={() => addElement(item.type)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f0f2f5] text-[#1c1e21] text-[12px] font-semibold hover:bg-[#e4e6eb] transition-colors">
                <span className="w-6 h-6 rounded bg-[#1877f2] text-white flex items-center justify-center text-[11px] font-bold">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="border-t border-[#dadde1] pt-2 mt-3">
              <h4 className="text-[11px] font-bold text-[#65676b] uppercase tracking-wide mb-2">Page Name</h4>
              <input type="text" value={activePage.name}
                onChange={(e) => updatePage({ name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[12px] focus:outline-none focus:border-[#1877f2]" />
            </div>
            <div className="border-t border-[#dadde1] pt-2 mt-3">
              <h4 className="text-[11px] font-bold text-[#65676b] uppercase tracking-wide mb-2">Button Color</h4>
              <div className="flex flex-wrap gap-1.5">
                {["#1877f2", "#42b72a", "#f02849", "#f7b928", "#8b5cf6", "#1c1e21"].map((c) => (
                  <button key={c} onClick={() => updatePage({ buttonColor: c })}
                    className={`w-6 h-6 rounded-full border-2 ${activePage.buttonColor === c ? "border-[#1877f2] scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form editor panel */}
        {showFormEditor && !previewMode && (
          <div className="w-[280px] bg-white border-r border-[#dadde1] p-3 shrink-0 overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[13px] font-bold text-[#1c1e21]">Form Editor</h4>
              <button onClick={addFormPage} className="text-[11px] text-[#1877f2] font-semibold hover:underline">+ Add Page</button>
            </div>
            {/* Form page tabs (horizontal scroll like Meta lead forms) */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {activePage.formPages.map((fp, i) => (
                <button key={fp.id} onClick={() => setActiveFormPage(i)}
                  className={`px-3 py-1 rounded-full text-[11px] font-semibold shrink-0 transition-colors ${i === activeFormPage ? "bg-[#1877f2] text-white" : "bg-[#f0f2f5] text-[#65676b] hover:bg-[#e4e6eb]"}`}>
                  {fp.title}
                </button>
              ))}
            </div>
            {activePage.formPages[activeFormPage] && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input type="text" value={activePage.formPages[activeFormPage].title}
                    onChange={(e) => {
                      const fps = [...activePage.formPages];
                      fps[activeFormPage] = { ...fps[activeFormPage], title: e.target.value };
                      updatePage({ formPages: fps });
                    }}
                    className="flex-1 px-2 py-1 rounded border border-[#dadde1] text-[12px] focus:outline-none focus:border-[#1877f2]" />
                  {activePage.formPages.length > 1 && (
                    <button onClick={() => removeFormPage(activeFormPage)} className="text-[#fa3e3e] text-[10px] hover:opacity-70">&times;</button>
                  )}
                </div>
                {activePage.formPages[activeFormPage].fields.map((field) => (
                  <div key={field.id} className="bg-[#f7f8fa] rounded-lg p-2 border border-[#e4e6eb]">
                    <div className="flex items-center gap-1 mb-1">
                      <input type="text" value={field.label}
                        onChange={(e) => updateFormField(activeFormPage, field.id, { label: e.target.value })}
                        className="flex-1 px-2 py-1 rounded border border-[#dadde1] text-[11px] font-semibold focus:outline-none focus:border-[#1877f2]" />
                      <button onClick={() => removeFormField(activeFormPage, field.id)} className="text-[#fa3e3e] text-[10px] hover:opacity-70">&times;</button>
                    </div>
                    <div className="flex gap-1">
                      <select value={field.type}
                        onChange={(e) => updateFormField(activeFormPage, field.id, { type: e.target.value as FormField["type"] })}
                        className="flex-1 px-2 py-1 rounded border border-[#dadde1] text-[10px] focus:outline-none">
                        <option value="text">Text</option>
                        <option value="email">Email</option>
                        <option value="phone">Phone</option>
                        <option value="select">Dropdown</option>
                        <option value="textarea">Long Text</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-[#65676b]">
                        <input type="checkbox" checked={field.required}
                          onChange={(e) => updateFormField(activeFormPage, field.id, { required: e.target.checked })} />
                        Req
                      </label>
                    </div>
                  </div>
                ))}
                <button onClick={() => addFormField(activeFormPage)}
                  className="w-full py-1.5 rounded-lg bg-[#e7f3ff] text-[#1877f2] text-[11px] font-semibold hover:bg-[#d2e8ff]">
                  + Add Field
                </button>
              </div>
            )}
          </div>
        )}

        {/* Page preview / editor */}
        <div className="flex-1 bg-[#f0f2f5] overflow-y-auto flex justify-center py-8">
          <div className="w-full max-w-[900px] bg-white rounded-xl shadow-lg border border-[#dadde1] overflow-hidden">
            {/* Hero section */}
            <div className={`${isSplit ? "flex" : ""} min-h-[400px]`}>
              <div className={`${isSplit ? "flex-1" : ""} p-8 md:p-12 flex flex-col ${isSplit ? "justify-center" : "items-center text-center justify-center"}`}>
                {activePage.elements.map((el) => (
                  <div key={el.id} className={`relative group mb-3 ${!previewMode ? "hover:outline hover:outline-2 hover:outline-[#1877f2]/30 hover:outline-offset-2 rounded" : ""}`}>
                    {!previewMode && (
                      <div className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 z-10">
                        <button onClick={() => moveElement(el.id, -1)} className="w-5 h-5 rounded bg-white shadow border border-[#dadde1] flex items-center justify-center text-[10px] text-[#65676b] hover:bg-[#f0f2f5]">↑</button>
                        <button onClick={() => moveElement(el.id, 1)} className="w-5 h-5 rounded bg-white shadow border border-[#dadde1] flex items-center justify-center text-[10px] text-[#65676b] hover:bg-[#f0f2f5]">↓</button>
                        <button onClick={() => removeElement(el.id)} className="w-5 h-5 rounded bg-white shadow border border-[#dadde1] flex items-center justify-center text-[10px] text-[#fa3e3e] hover:bg-[#ffebe9]">&times;</button>
                      </div>
                    )}
                    {el.type === "headline" && (
                      previewMode ? (
                        <h1 className="text-[32px] md:text-[40px] font-bold text-[#1c1e21] leading-tight">{el.content}</h1>
                      ) : (
                        <input type="text" value={el.content} onChange={(e) => updateElement(el.id, e.target.value)}
                          className="text-[32px] md:text-[40px] font-bold text-[#1c1e21] leading-tight bg-transparent outline-none w-full border-b-2 border-transparent focus:border-[#1877f2]" />
                      )
                    )}
                    {el.type === "subheadline" && (
                      previewMode ? (
                        <h2 className="text-[18px] md:text-[22px] text-[#65676b] leading-snug">{el.content}</h2>
                      ) : (
                        <input type="text" value={el.content} onChange={(e) => updateElement(el.id, e.target.value)}
                          className="text-[18px] md:text-[22px] text-[#65676b] leading-snug bg-transparent outline-none w-full border-b-2 border-transparent focus:border-[#1877f2]" />
                      )
                    )}
                    {el.type === "body" && (
                      previewMode ? (
                        <p className="text-[16px] text-[#65676b] leading-relaxed">{el.content}</p>
                      ) : (
                        <textarea value={el.content} onChange={(e) => updateElement(el.id, e.target.value)} rows={3}
                          className="text-[16px] text-[#65676b] leading-relaxed bg-transparent outline-none w-full resize-none border-b-2 border-transparent focus:border-[#1877f2]" />
                      )
                    )}
                    {el.type === "button" && (
                      previewMode ? (
                        <button className="px-8 py-3 rounded-lg text-white font-semibold text-[16px] hover:opacity-90 transition-opacity mt-2"
                          style={{ backgroundColor: activePage.buttonColor }}>
                          {el.content}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="px-6 py-2.5 rounded-lg text-white font-semibold text-[14px]" style={{ backgroundColor: activePage.buttonColor }}>
                            <input type="text" value={el.content} onChange={(e) => updateElement(el.id, e.target.value)}
                              className="bg-transparent outline-none text-white placeholder-white/50 w-[120px]" />
                          </div>
                        </div>
                      )
                    )}
                    {el.type === "spacer" && <div className="h-8 border-t border-[#e4e6eb] my-4" />}
                  </div>
                ))}
              </div>

              {/* Right side: image or form */}
              {isSplit && (
                <div className="flex-1 bg-[#f0f2f5] flex items-center justify-center p-6">
                  {isFormTemplate ? (
                    <FormPreview formPages={activePage.formPages} buttonColor={activePage.buttonColor} activeFormPage={activeFormPage} setActiveFormPage={setActiveFormPage} />
                  ) : (
                    <div className="w-full h-full min-h-[300px] bg-[#e4e6eb] rounded-xl flex items-center justify-center">
                      <svg className="w-16 h-16 text-[#dadde1]" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom form section for non-split templates */}
            {!isSplit && activePage.formPages.length > 0 && (
              <div className="border-t border-[#e4e6eb] bg-[#f7f8fa] p-8 flex justify-center">
                <div className="w-full max-w-[400px]">
                  <FormPreview formPages={activePage.formPages} buttonColor={activePage.buttonColor} activeFormPage={activeFormPage} setActiveFormPage={setActiveFormPage} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormPreview({ formPages, buttonColor, activeFormPage, setActiveFormPage }: {
  formPages: FormPage[]; buttonColor: string; activeFormPage: number; setActiveFormPage: (i: number) => void;
}) {
  const page = formPages[activeFormPage] || formPages[0];
  if (!page) return null;

  return (
    <div className="w-full max-w-[360px] bg-white rounded-xl shadow-lg border border-[#dadde1] overflow-hidden">
      {/* Form header */}
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-[18px] font-bold text-[#1c1e21]">{page.title}</h3>
        {formPages.length > 1 && (
          <div className="flex items-center gap-2 mt-2">
            {/* Page dots - Meta lead form style with horizontal scroll */}
            <div className="flex gap-1.5 flex-1">
              {formPages.map((_, i) => (
                <button key={i} onClick={() => setActiveFormPage(i)}
                  className={`h-1.5 rounded-full transition-all ${i === activeFormPage ? "bg-[#1877f2] flex-[2]" : "bg-[#dadde1] flex-1"}`} />
              ))}
            </div>
            <span className="text-[10px] text-[#8a8d91]">{activeFormPage + 1}/{formPages.length}</span>
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="px-5 pb-3 space-y-3">
        {page.fields.map((field) => (
          <div key={field.id}>
            <label className="text-[12px] font-semibold text-[#1c1e21] mb-1 block">
              {field.label} {field.required && <span className="text-[#fa3e3e]">*</span>}
            </label>
            {field.type === "textarea" ? (
              <textarea placeholder={field.placeholder} rows={3}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] resize-none focus:outline-none focus:border-[#1877f2]" />
            ) : field.type === "select" ? (
              <select className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2]">
                <option value="">{field.placeholder}</option>
                {(field.options || ["Option 1", "Option 2", "Option 3"]).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input type={field.type} placeholder={field.placeholder}
                className="w-full px-3 py-2 rounded-lg border border-[#dadde1] text-[13px] focus:outline-none focus:border-[#1877f2]" />
            )}
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="px-5 pb-5 flex gap-2">
        {activeFormPage > 0 && (
          <button onClick={() => setActiveFormPage(activeFormPage - 1)}
            className="flex-1 py-2.5 rounded-lg border border-[#dadde1] text-[#65676b] text-[14px] font-semibold hover:bg-[#f0f2f5]">
            Back
          </button>
        )}
        {activeFormPage < formPages.length - 1 ? (
          <button onClick={() => setActiveFormPage(activeFormPage + 1)}
            className="flex-1 py-2.5 rounded-lg text-white text-[14px] font-semibold hover:opacity-90"
            style={{ backgroundColor: buttonColor }}>
            Next
          </button>
        ) : (
          <button className="flex-1 py-2.5 rounded-lg text-white text-[14px] font-semibold hover:opacity-90"
            style={{ backgroundColor: buttonColor }}>
            Submit
          </button>
        )}
      </div>
    </div>
  );
}
