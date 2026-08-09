import { ProposalDetail } from "../../../src/components/voting/ProposalDetail";

export default async function ProposalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProposalDetail proposalId={id} />;
}
