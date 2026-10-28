import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const u = size.width / 100;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#1c2260,#0a0e2a)",
        }}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            width: 66 * u,
            height: 56 * u,
            marginTop: 8 * u,
            borderRadius: "52% 48% 42% 42% / 62% 62% 38% 38%",
            background: "radial-gradient(circle at 32% 24%, #ffa99c, #ff6a55 45%, #d93f2b)",
          }}
        >
          <div style={{ position: "absolute", left: 11 * u, top: 7 * u, width: 18 * u, height: 10 * u, borderRadius: 999, background: "rgba(255,255,255,0.75)" }} />
          <div style={{ position: "absolute", left: 18 * u, top: 25 * u, width: 8 * u, height: 8 * u, borderRadius: 999, background: "#2a1630" }} />
          <div style={{ position: "absolute", right: 18 * u, top: 25 * u, width: 8 * u, height: 8 * u, borderRadius: 999, background: "#2a1630" }} />
          <div style={{ position: "absolute", left: 27 * u, top: 38 * u, width: 12 * u, height: 7 * u, borderBottom: `${1.6 * u}px solid #3b1d2e`, borderRadius: "0 0 999px 999px" }} />
        </div>
      </div>
    ),
    size,
  );
}
