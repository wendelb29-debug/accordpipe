// Blue "sky/horizon" background inspired by Bitrix24 feed.
// Fixed, behind content, purely decorative.
export function FeedBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#dbe9fb 0%,#bcd6f5 22%,#8fb6ec 52%,#5d8fd8 100%)",
        }}
      />
      {/* Horizon glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1100px 520px at 78% 30%, rgba(255,255,255,.55), transparent 60%)",
        }}
      />
      {/* Deep water shade at the bottom */}
      <div
        className="absolute left-0 right-0 bottom-0 h-1/2"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(40,86,168,.30))",
        }}
      />
      {/* Subtle stars */}
      <div
        className="absolute inset-0 opacity-50 mix-blend-screen bg-no-repeat"
        style={{
          backgroundImage: [
            "radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,.9) 50%, transparent 51%)",
            "radial-gradient(1px 1px at 36% 9%, rgba(255,255,255,.7) 50%, transparent 51%)",
            "radial-gradient(1px 1px at 64% 22%, rgba(255,255,255,.8) 50%, transparent 51%)",
            "radial-gradient(1px 1px at 82% 12%, rgba(255,255,255,.7) 50%, transparent 51%)",
            "radial-gradient(1px 1px at 91% 34%, rgba(255,255,255,.6) 50%, transparent 51%)",
            "radial-gradient(1px 1px at 22% 42%, rgba(255,255,255,.5) 50%, transparent 51%)",
          ].join(","),
        }}
      />
    </div>
  );
}
