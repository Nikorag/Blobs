import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 340,
          fontWeight: 900,
        }}
      >
        ♠
      </div>
    ),
    size,
  );
}
