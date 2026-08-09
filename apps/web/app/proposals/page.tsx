import { ProposalList } from "../../src/components/voting/ProposalList";

const DEMO_BUCC_ID = "11111111-1111-1111-1111-111111111111";

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ buccId?: string }>;
}) {
  const { buccId } = await searchParams;
  return (
    <main className="min-h-screen bg-gray-100 py-12">
      <ProposalList buccId={buccId ?? DEMO_BUCC_ID} />
    </main>
  );
}
