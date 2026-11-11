import { PageSkeleton } from '@/components/loading-states';

export function DetailLoading({ label, artist = false }: { label: string; artist?: boolean }) {
  return <PageSkeleton variant={artist ? 'profile' : 'project'} label={label}/>;
}
