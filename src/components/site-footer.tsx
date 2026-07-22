export function SiteFooter() {
  return (
    <footer className="border-t border-border py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 px-6 md:flex-row">
        <span className="font-serif text-xl italic tracking-tight opacity-40">Dock Archive</span>
        <div className="flex gap-12">
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Follow</span>
            <a href="#" className="text-sm text-ink/60 transition-colors hover:text-ink">Twitter / X</a>
          </div>
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Legal</span>
            <a href="#" className="text-sm text-ink/60 transition-colors hover:text-ink">Privacy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
