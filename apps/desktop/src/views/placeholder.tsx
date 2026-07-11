export function Placeholder({ title }: { title: string }) {
  return (
    <main className="content placeholder-view">
      <div>
        <h1>{title}</h1>
        <p>
          This module ships with the full ERP build (master prompt Part 3). The API
          endpoints behind it are already live — see <code>apps/api</code>.
        </p>
      </div>
    </main>
  );
}
