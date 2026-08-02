export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="rounded-xl border border-[var(--app-border)] bg-white p-8 shadow-sm">
      <h2 className="text-xl font-semibold text-slate-900 mb-2">{title}</h2>
      <p className="text-slate-600 text-sm">
        Module en cours de migration vers l’application desktop. Les données restent accessibles
        via l’API.
      </p>
    </div>
  );
}
