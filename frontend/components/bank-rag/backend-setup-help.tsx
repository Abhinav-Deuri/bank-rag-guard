export function BackendSetupHelp() {
  return (
    <details className="group rounded-lg border border-line-soft bg-bg/60 px-4 py-3 text-sm text-dim">
      <summary className="cursor-pointer select-none font-medium text-fg marker:text-faint">
        How to connect the backend
      </summary>
      <ol className="mt-3 list-decimal space-y-2.5 pl-5 leading-relaxed marker:text-faint">
        <li>
          Start the Python API from the repository root (it needs its own <code className="font-mono text-[0.85em] text-fg">.env</code> and the
          PostgreSQL database built by the notebooks):
          <pre className="mt-1.5 overflow-x-auto rounded-md bg-inset px-3 py-2 font-mono text-xs text-fg">
            uvicorn app:app --host 127.0.0.1 --port 8000
          </pre>
        </li>
        <li>
          In <code className="font-mono text-[0.85em] text-fg">frontend/</code>, copy{" "}
          <code className="font-mono text-[0.85em] text-fg">.env.example</code> to{" "}
          <code className="font-mono text-[0.85em] text-fg">.env.local</code> and set{" "}
          <code className="font-mono text-[0.85em] text-fg">BACKEND_URL</code>, then restart{" "}
          <code className="font-mono text-[0.85em] text-fg">npm run dev</code>.
        </li>
        <li>
          A hosted frontend cannot reach <code className="font-mono text-[0.85em] text-fg">127.0.0.1</code> on your laptop. Point{" "}
          <code className="font-mono text-[0.85em] text-fg">BACKEND_URL</code> at an address its server can reach.
        </li>
      </ol>
    </details>
  );
}
