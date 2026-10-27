import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg,#17603a,#07140f)",
          color: "#f5c451",
          fontSize: 120,
          fontWeight: 900,
        }}
      >
        ♠
      </div>
    ),
    size,
  );
}
