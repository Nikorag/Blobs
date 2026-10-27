import { Suspense } from "react";
import { RoomClient } from "@/components/RoomClient";
import { normaliseCode } from "@/lib/server/store";

export const metadata = { title: "Blobs · Table" };

async function Room({ params }: { params: PageProps<"/room/[code]">["params"] }) {
  const { code } = await params;
  return <RoomClient code={normaliseCode(code)} />;
}

export default function Page(props: PageProps<"/room/[code]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <Room params={props.params} />
    </Suspense>
  );
}
