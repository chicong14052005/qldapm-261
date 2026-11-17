export default function EmptyState({ text }: { text: string }) {
  return (
    <div className="empty-state">
      <span>✓</span>
      <h3>Mọi thứ đã được cập nhật</h3>
      <p>{text}</p>
    </div>
  );
}

