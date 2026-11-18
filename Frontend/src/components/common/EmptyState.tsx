import { CheckCircle2 } from "lucide-react";

export default function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <CheckCircle2 size={24} strokeWidth={1.9} />
      </span>
      <h3>Mọi thứ đã được cập nhật</h3>
      <p>{text}</p>
    </div>
  );
}
