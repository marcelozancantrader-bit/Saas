import { ImageResponse } from "next/og";

/**
 * Open Graph image — preview ao compartilhar link no WhatsApp, LinkedIn,
 * Twitter, etc. Gerada dinamicamente em build/edge via @vercel/og.
 *
 * 1200x630 é o tamanho padrão do OG/Twitter (ratio 1.91:1).
 */

export const runtime = "edge";
export const alt = "Memorial.ai — Da planta ao contrato em horas, não semanas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "linear-gradient(135deg, #0F172A 0%, #1E3A8A 60%, #1E40AF 100%)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Logo + nome */}
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="44" height="44" viewBox="0 0 32 32" fill="none">
            <path
              d="M7 24 L7 9 L12 17 L16 11 L20 17 L25 9 L25 24"
              stroke="#1E3A8A"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="25" cy="24" r="1.8" fill="#60A5FA" />
          </svg>
        </div>
        <p style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>
          Memorial<span style={{ color: "#60A5FA" }}>.ai</span>
        </p>
      </div>

      {/* Headline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <p
          style={{
            fontSize: 18,
            color: "#93C5FD",
            textTransform: "uppercase",
            letterSpacing: 2,
            margin: 0,
          }}
        >
          Para arquitetos e engenheiros civis no Brasil
        </p>
        <h1
          style={{
            fontSize: 78,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -2.5,
            margin: 0,
            maxWidth: 980,
          }}
        >
          Da planta ao contrato em <span style={{ color: "#60A5FA" }}>horas</span>, não semanas.
        </h1>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          gap: 36,
          fontSize: 19,
          color: "#CBD5E1",
          borderTop: "1px solid rgba(255,255,255,0.15)",
          paddingTop: 24,
        }}
      >
        <span>📐 Extração de planta por IA</span>
        <span>📄 10 tipos de documento</span>
        <span>👤 Portal do cliente</span>
        <span>💰 Orçamento SINAPI</span>
      </div>
    </div>,
    { ...size },
  );
}
