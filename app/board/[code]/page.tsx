import { Suspense } from "react";
import { Board } from "@/components/Board";
import { normaliseCode } from "@/lib/server/store";

export const metadata = { title: "Blobs · The Board" };

async function BoardRoom({ params }: { params: PageProps<"/board/[code]">["params"] }) {
  const { code } = await params;
  return <Board code={normaliseCode(code)} />;
}

export default function Page(props: PageProps<"/board/[code]">) {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <BoardRoom params={props.params} />
    </Suspense>
  );
}
