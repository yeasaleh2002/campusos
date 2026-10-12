import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/seo";

export const alt = "CampusOS - One place for all of City University";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social card (pages without their own image inherit it). */
export default function OpenGraphImage() {
  const modules = ["Events & Clubs", "Notes & Questions", "Bus & Helpdesk", "Lost & Found"];
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "white",
          background: "radial-gradient(circle at 15% 20%, #6366f1 0%, transparent 45%), radial-gradient(circle at 85% 80%, #10b981 0%, transparent 45%), linear-gradient(135deg, #1e1b4b 0%, #0b0d1a 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "linear-gradient(135deg, #4338ca, #059669)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800 }}>C</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 40, fontWeight: 800 }}>CampusOS</span>
            <span style={{ fontSize: 20, letterSpacing: 6, opacity: 0.7 }}>CITY UNIVERSITY</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 950 }}>{siteConfig.tagline}</span>
          <div style={{ display: "flex", gap: 14 }}>
            {modules.map((label) => (
              <span key={label} style={{ fontSize: 24, padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
