export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="h-16 w-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-accent-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">{description}</p>
      {action}
    </div>
  );
}