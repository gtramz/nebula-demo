import { Link } from 'wouter';
import { useListMyInvestments, useReceivedInvestments } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { ContentWidth } from '@/components/shell/app-shell';
import { ContributionHistory } from '@/components/contribution-history';
import { SectionSkeleton } from '@/components/loading-states';

export default function Pledges({ received = false }: { received?: boolean }) {
  const { user } = useAuth();
  const permitted = user?.role === (received ? 'artist' : 'investor');
  return (
    <ContentWidth className="py-10 pb-32 space-y-6 w-full">
      <h1 className="text-3xl sm:text-5xl font-bold">{received ? 'Contributions received' : 'your pledges'}</h1>
      {!received && <p className="text-sm text-muted">Your private contribution history.</p>}
      {permitted && user ? (received ? <ReceivedHistory key={user.artistId} /> : <InvestorHistory key={user.investorId} />) : (
        <div className="border border-border p-8 space-y-4">
          <p className="text-muted">{user ? 'This history belongs to a different profile type.' : 'Log in to view your private history.'}</p>
          <Link href={user ? (user.role === 'artist' ? '/received' : '/pledges') : '/login'} className="underline">{user ? 'Go to my history' : 'Log in'}</Link>
        </div>
      )}
    </ContentWidth>
  );
}

function InvestorHistory() {
  const { data, isLoading, error } = useListMyInvestments();
  if (isLoading) return <SectionSkeleton variant="list" label="Loading your contribution history" rows={4}/>;
  if (error) return <p role="alert" className="text-danger">{error.message}</p>;
  return <ContributionHistory entries={data ?? []} />;
}

function ReceivedHistory() {
  const { data, isLoading, error } = useReceivedInvestments();
  if (isLoading) return <SectionSkeleton variant="list" label="Loading contributions received" rows={4}/>;
  if (error) return <p role="alert" className="text-danger">{error.message}</p>;
  return <ContributionHistory entries={data ?? []} received />;
}
