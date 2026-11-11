import { SectionSkeleton } from '@/components/loading-states';
import { MorphAdvanceButton, OnboardingBadge, FieldError, type MorphAdvanceHandle } from '@/components/blob-face';
import { isPresentation } from '@/features/presentation';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useMyArtistPreferences, useMyArtistOnboarding, useUpdateArtistIdentity, creativeRoleTaxonomy, musicalGenreTaxonomy, type Artist, type ArtistPreferences, type ArtistOnboarding, type ArtistIdentityUpdate, type OnboardingStep } from '@nebula/local';
import { useAuth } from '@/context/AuthContext';
import { ContentWidth } from '@/components/shell/app-shell';
import { controlStyles, Panel } from '@/components/antiq/workspace';
import { useLeaveGuard } from '@/components/shell/navigation-guard';
import { IdentityFields, CreativeFields, PreferenceFields, CompletionFields, profileValues, preferenceValues } from './fields';

const steps = ['Identity', 'Creative identity', 'Interests & preferences', 'Profile completion'];
export default function ArtistOnboardingPage() {
  const { user } = useAuth();
  if (!user) return <ContentWidth className="py-12 space-y-5"><h1 className="text-3xl font-bold">Artist setup</h1><p>Log in to resume your artist profile.</p><Link className={controlStyles.primary} href="/login">Log in</Link></ContentWidth>;
  if (user.role !== 'artist') return <ContentWidth className="py-12 space-y-5"><h1 className="text-3xl font-bold">Artist setup</h1><p>This setup is for artist accounts.</p></ContentWidth>;
  return <LoadSetup key={user.artistId} artist={user.artist!} />;
}
function LoadSetup({ artist }: { artist: Artist }) {
  const preferences = useMyArtistPreferences(), onboarding = useMyArtistOnboarding();
  if (preferences.isLoading || onboarding.isLoading) return <ContentWidth className="py-12"><SectionSkeleton variant="form" label="Loading saved artist progress" rows={4}/></ContentWidth>;
  if (!preferences.data || !onboarding.data) return <ContentWidth className="py-12 space-y-4"><p role="alert">{preferences.error?.message ?? onboarding.error?.message ?? 'Could not load your progress.'}</p><button className={controlStyles.button} onClick={() => { void preferences.refetch(); void onboarding.refetch(); }}>Retry setup</button></ContentWidth>;
  return <>{(preferences.isError || onboarding.isError) && <p role="alert" className="p-4">Saved progress could not refresh. Your current edits remain here. <button className={controlStyles.button} onClick={() => { void preferences.refetch(); void onboarding.refetch(); }}>Retry setup</button></p>}<Setup artist={artist} preferences={preferences.data} onboarding={onboarding.data} /></>;
}
function Setup({ artist, preferences, onboarding }: { artist: Artist; preferences: ArtistPreferences; onboarding: ArtistOnboarding }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<OnboardingStep>(onboarding.step), [profile, setProfile] = useState(() => profileValues(artist)), [privateValues, setPrivateValues] = useState(() => preferenceValues(preferences));
  const initial = useRef(JSON.stringify([profile, privateValues])), title = useRef<HTMLHeadingElement>(null);
  const update = useUpdateArtistIdentity(), [saved, setSaved] = useState('');
  const [advancing, setAdvancing] = useState(false), [validationError, setValidationError] = useState('');
  const form = useRef<HTMLFormElement>(null), advance = useRef<MorphAdvanceHandle>(null), afterSave = useRef<(() => void) | null>(null), saving = useRef(false), alive = useRef(true);
  const locked = update.isPending || advancing;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const dirty = initial.current !== JSON.stringify([profile, privateValues]);
  const release = useLeaveGuard(locked || dirty ? 'Leave without saving this setup step? Previously saved steps are safe.' : null);
  const previousStep = useRef(step);
  useEffect(() => { title.current?.focus({ preventScroll: true }); if (previousStep.current !== step) title.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); previousStep.current = step; }, [step]);
  function patch(): ArtistIdentityUpdate {
    if (step === 1) return { profile: { name: profile.name, picture: profile.picture, bio: profile.bio } };
    if (step === 2) return { profile: { name: profile.name, creativeRoles: profile.creativeRoles, genreIds: profile.genreIds } };
    if (step === 3) return { preferences: privateValues };
    return { profile: { name: profile.name, basedIn: profile.basedIn, recordLabel: profile.recordLabel, externalLinks: profile.externalLinks, publicInterests: profile.publicInterests, collaborationAvailability: profile.collaborationAvailability } };
  }
  function validate() {
    setSaved(''); setValidationError('');
    if (form.current && !form.current.checkValidity()) {
      const invalid = form.current.querySelector<HTMLInputElement>('input:invalid,textarea:invalid,select:invalid');
      const label = invalid?.labels?.[0]?.textContent?.trim() || 'the highlighted field';
      setValidationError(`Check ${label}: ${invalid?.validationMessage || 'enter a valid value.'}`);
      form.current.reportValidity();
      return false;
    }
    return true;
  }
  async function persist(action: 'next' | 'back' | 'exit' | 'skip') {
    if (saving.current) return false;
    saving.current = true;
    const next = action === 'back' ? Math.max(1, step - 1) : action === 'exit' ? step : Math.min(4, step + 1);
    const finish = step === 4 && action === 'next';
    try {
      const result = await update.mutateAsync({ data: { ...(action === 'skip' ? {} : patch()), onboarding: { step: next as OnboardingStep, ...(action === 'next' ? { completeStep: step } : {}), ...(finish ? { finish: true } : {}) } } });
      if (!alive.current) return false;
      const nextProfile = profileValues(result.artist), nextPreferences = preferenceValues(result.preferences);
      initial.current = JSON.stringify([nextProfile, nextPreferences]); setProfile(nextProfile); setPrivateValues(nextPreferences);
      setSaved('Progress saved.');
      afterSave.current = () => { release(); if (finish || action === 'exit') navigate(finish && isPresentation() ? '/explore' : '/profile'); else setStep(next as OnboardingStep); };
      return true;
    } finally { saving.current = false; }
  }
  function advanceAfterSave() { const done = afterSave.current; afterSave.current = null; done?.(); }
  function showFailure(error: unknown) { setValidationError(error instanceof Error ? error.message : 'Could not save. Your edits remain here; please try again.'); }
  async function saveDirect(action: 'back' | 'exit') {
    if (locked || !validate()) return;
    try { if (await persist(action)) advanceAfterSave(); } catch (error) { showFailure(error); }
  }
  return <ContentWidth className="py-8 md:py-12 space-y-6 pb-16">
    <div className="flex items-center gap-3"><OnboardingBadge/><span className="voice text-xs text-muted">{step} OF 4</span></div>
    <div><h1 ref={title} tabIndex={-1} className="text-3xl md:text-4xl font-bold outline-none">{steps[step - 1]}</h1></div>
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs" aria-label="Artist setup progress">{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined} className={`border-t-2 pt-3 ${step === index + 1 ? 'border-accent text-ink' : 'border-border text-muted'}`}>{index + 1}. {label}</li>)}</ol>
    <Panel>
      <form ref={form} noValidate className="space-y-8" onSubmit={event => { event.preventDefault(); advance.current?.run(); }}>
        <fieldset disabled={locked} className="space-y-6 min-w-0">
          {step === 1 && <IdentityFields value={profile} onChange={setProfile} />}
          {step === 2 && <CreativeFields value={profile} onChange={setProfile} disabled={locked} />}
          {step === 3 && <PreferenceFields value={privateValues} onChange={setPrivateValues} disabled={locked} />}
          {step === 4 && <><CompletionFields value={profile} onChange={setProfile} disabled={locked} /><section aria-label="Profile review" className="border-t border-border pt-5 space-y-3"><h2 className="text-xl font-bold">Review your profile</h2><p className="text-lg font-semibold">{profile.name}</p><p className="whitespace-pre-wrap break-words">{profile.bio || 'No biography added.'}</p><p>{profile.creativeRoles?.map(id => creativeRoleTaxonomy.find(r => r.id === id)?.label).join(' · ') || 'No creative roles selected.'}</p><p>{profile.genreIds?.map(id => musicalGenreTaxonomy.find(g => g.id === id)?.label).join(' · ') || 'No musical genres selected.'}</p><p className="text-sm text-muted">Your preferences stay private.</p></section></>}
          <FieldError message={validationError || update.error?.message}/>
          <p role="status" className="text-sm text-muted">{update.isPending ? 'Saving your progress…' : saved}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {step > 1 && <button type="button" className={controlStyles.button} onClick={() => void saveDirect('back')}>Save & previous step</button>}
            <MorphAdvanceButton ref={advance} buttonType="submit" onBeforeAdvance={validate} onAttempt={() => persist('next')} onAdvance={advanceAfterSave} onError={showFailure} onPendingChange={setAdvancing} disabled={update.isPending} buttonClassName={controlStyles.primary}>{step === 4 ? 'Finish setup' : 'Save & continue'}</MorphAdvanceButton>
            {step < 4 && <MorphAdvanceButton onBeforeAdvance={() => { if (dirty && !window.confirm('Skip without saving this step? Previously saved information will remain.')) return 'cancel'; setValidationError(''); return true; }} onAttempt={() => persist('skip')} onAdvance={advanceAfterSave} onError={showFailure} onPendingChange={setAdvancing} disabled={update.isPending} buttonClassName={controlStyles.button}>Skip this step</MorphAdvanceButton>}
            <button type="button" className={controlStyles.button} onClick={() => void saveDirect('exit')}>{dirty ? 'Save and exit' : 'Skip for now'}</button>
          </div>
        </fieldset>
      </form>
    </Panel>
  </ContentWidth>;
}
