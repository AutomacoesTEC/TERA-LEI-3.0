export default function EmptyState({ title, description, action }) {
  return (
    <div className="empty-state">
      <div className="empty-title">{title}</div>
      <div className="empty-description">{description}</div>
      {action}
    </div>
  );
}
