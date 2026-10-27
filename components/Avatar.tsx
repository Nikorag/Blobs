const HUES = [24, 200, 330, 140, 275, 50, 170, 0];

export function avatarColor(index: number): string {
  return `hsl(${HUES[index % HUES.length]} 70% 55%)`;
}

interface Props {
  name: string;
  index: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-8 text-sm", md: "size-11 text-lg", lg: "size-16 text-2xl" };

export function Avatar({ name, index, size = "md", className = "" }: Props) {
  return (
    <div
      aria-hidden
      style={{ background: avatarColor(index) }}
      className={`grid shrink-0 place-items-center rounded-full font-extrabold text-black/70 ${SIZES[size]} ${className}`}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </div>
  );
}
