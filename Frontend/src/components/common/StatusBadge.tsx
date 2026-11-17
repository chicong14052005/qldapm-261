import { labels } from "@/config/status";

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${status.toLowerCase()}`}>
      {labels[status] ?? status}
    </span>
  );
}

