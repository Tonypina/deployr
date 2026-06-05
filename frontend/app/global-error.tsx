"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-[#131313] text-[#e5e2e1] flex items-center justify-center p-8">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-xs font-mono uppercase tracking-widest text-[#c1c6d7]">Error inesperado</p>
          <h1 className="text-2xl font-bold">{error.message || "Algo salió mal"}</h1>
          <button
            onClick={reset}
            className="px-6 py-2 rounded-lg bg-[#adc6ff] text-[#002e69] font-bold hover:opacity-90 transition-opacity"
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
