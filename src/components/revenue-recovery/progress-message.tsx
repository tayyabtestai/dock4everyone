import { useEffect, useState } from "react";

/** Rotating, non-numeric progress copy. Never reveals step counts. */
export function ProgressMessage({ messages, index }: { messages: string[]; index: number }) {
  const [shown, setShown] = useState(messages[0] ?? "");
  useEffect(() => {
    if (!messages.length) return;
    setShown(messages[index % messages.length]!);
  }, [messages, index]);
  if (!shown) return null;
  return (
    <p key={shown} className="animate-in fade-in text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground duration-500">
      {shown}
    </p>
  );
}