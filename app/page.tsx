import AdCard from "./components/AdCard";

export default function Home() {
  return (
    <main className="min-h-screen py-8">
      <div className="text-center mb-8 px-4">
        <h1 className="text-[24px] font-bold text-[#1c1e21]">Ads Simulator</h1>
        <p className="text-[14px] text-[#65676b] mt-1">
          Create and preview Meta-style ad cards — click any text on the preview to edit
        </p>
      </div>
      <AdCard />
    </main>
  );
}
