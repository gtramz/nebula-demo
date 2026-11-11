import { MorphAdvanceButton, type MorphAdvanceHandle } from '@/components/blob-face';
import { CreationFrame, useCreationSteps } from '@/components/guided/creation';
import { JourneyBack, JourneyContext } from '@/components/guided/journey';
import { SectionSkeleton } from '@/components/loading-states';
import { toast } from '@/hooks/use-toast';
import { useRef, useState } from 'react';
import { Link } from 'wouter';
import { useMyArtistPreferences, useMyArtistOnboarding, useUpdateArtistIdentity, type Artist, type ArtistPreferences } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { controlStyles, Panel } from '@/components/antiq/workspace';
import { profileValues, preferenceValues, IdentityFields, CreativeFields, CompletionFields, PreferenceFields, LegacyIdentityValues } from './fields';

// Arrays are one field; private preference groups are diffed separately.
function changedFields<T extends object>(next: T, original: T): Partial<T> {
  return Object.fromEntries(Object.entries(next).filter(([key, value]) =>
    JSON.stringify(value) !== JSON.stringify(original[key as keyof T]))) as Partial<T>;
}

export function ArtistCompletionPrompt() {
  const query = useMyArtistOnboarding();
  if (query.isError) return <p role="alert" className="text-sm">Profile setup status is unavailable. <button className={controlStyles.button} onClick={() => void query.refetch()}>Retry setup status</button></p>;
  if (!query.data || query.data.completedAt) return null;
  return <Panel><h2 className="text-xl font-bold">Make your profile yours.</h2><p className="text-sm text-muted">Complete your profile at your own pace.</p><Link href="/onboarding" className={controlStyles.button}>{query.data.completedSteps.length || query.data.step > 1 ? 'Resume artist setup' : 'Complete your artist profile'}</Link></Panel>;
}
export function ArtistIdentityEditor({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const preferences = useMyArtistPreferences();
  if (preferences.isLoading) return <SectionSkeleton variant="form" label="Loading profile preferences" rows={4}/>;
  if (!preferences.data) return <Panel><p role="alert">{preferences.error?.message ?? 'Profile preferences are unavailable.'}</p><button className={controlStyles.button} onClick={() => void preferences.refetch()}>Retry preferences</button><button className={controlStyles.button} onClick={onClose}>Cancel</button></Panel>;
  return <>{preferences.isError && <p role="alert">Preferences could not refresh. Your edits remain here. <button className={controlStyles.button} onClick={() => void preferences.refetch()}>Retry preferences</button></p>}<EditorForm key={user!.artistId} artist={user!.artist!} preferences={preferences.data} onClose={onClose} /></>;
}
function EditorForm({ artist, preferences, onClose }: { artist: Artist; preferences: ArtistPreferences; onClose: () => void }) {
  const [profile, setProfile] = useState(() => profileValues(artist)), [privateValues, setPrivateValues] = useState(() => preferenceValues(preferences));
  const baseline = useRef({ profile: structuredClone(artist), preferences: structuredClone(preferences), values: structuredClone(profile), privateValues: structuredClone(privateValues) });
  const initial = useRef(JSON.stringify([profile, privateValues])), update = useUpdateArtistIdentity();
  const flow = useCreationSteps(), advance = useRef<MorphAdvanceHandle>(null);
  const [advancing, setAdvancing] = useState(false);
  const changed = initial.current !== JSON.stringify([profile, privateValues]);
  const busy = update.isPending || advancing;
  const release = useLeaveGuard(busy || changed ? 'Leave without saving your profile changes?' : null);
  function cancel() { if (!changed || confirm('Leave without saving your profile changes?')) { release(); onClose(); } }
  return <Panel className="p-5 sm:p-6 space-y-6">
    <div className="flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">Profile details</h2><button type="button" disabled={busy} className={controlStyles.button} onClick={cancel}>Cancel</button></div>
    <form ref={flow.form} noValidate onSubmit={event => { event.preventDefault(); if (!busy) advance.current?.run(); }}>
      <CreationFrame label="Profile" steps={['Identity','Creative profile','Public details','Preferences','Review']} flow={flow} locked={busy} context={<JourneyContext cover={profile.picture} title={profile.name || artist.name} artist="Artist profile"/>} footer={<>
        {flow.step > 0 && <JourneyBack disabled={busy} onClick={() => flow.go(flow.step - 1)}/>}
        <MorphAdvanceButton ref={advance} buttonType="submit" disabled={update.isPending} onPendingChange={setAdvancing} onBeforeAdvance={() => flow.validate(flow.step)} onAttempt={async () => {
          if (flow.step !== 4) return;
          await update.mutateAsync({ data: { profile: changedFields(profile, baseline.current.values), preferences: { collaboration: changedFields(privateValues.collaboration, baseline.current.privateValues.collaboration), discovery: changedFields(privateValues.discovery, baseline.current.privateValues.discovery) }, expected: { profile: baseline.current.profile, preferences: baseline.current.preferences } } });
        }} onAdvance={() => { if (flow.step < 4) flow.go(flow.step + 1); else { release(); toast({title:'Profile saved'}); onClose(); } }} buttonClassName="guided-next" faceSize={72}>{flow.step < 4 ? 'Continue' : 'Save profile'}</MorphAdvanceButton>
      </>}>
        <fieldset disabled={busy} className="space-y-6">
          <section data-creation-step="0" hidden={flow.step !== 0}><IdentityFields value={profile} onChange={setProfile}/></section>
          <section data-creation-step="1" hidden={flow.step !== 1}><CreativeFields value={profile} onChange={setProfile} disabled={busy}/><LegacyIdentityValues artist={artist}/></section>
          <section data-creation-step="2" hidden={flow.step !== 2}><CompletionFields value={profile} onChange={setProfile} disabled={busy}/></section>
          <section data-creation-step="3" hidden={flow.step !== 3}><PreferenceFields value={privateValues} onChange={setPrivateValues} disabled={busy}/></section>
          <section data-creation-step="4" hidden={flow.step !== 4} className="creation-summary"><h3>{profile.name}</h3><p>{profile.bio}</p><p className="text-sm text-muted">Your identity, creative profile and public links will be updated. Discovery and collaboration preferences remain private.</p></section>
        </fieldset>
        {update.error && <p role="alert" className="text-sm text-danger">{update.error.message}</p>}
      </CreationFrame>
    </form>
  </Panel>;
}
