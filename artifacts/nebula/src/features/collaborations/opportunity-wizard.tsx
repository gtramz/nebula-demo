import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { OfferInput } from '@nebula/local';
import { MorphAdvanceButton, FieldError, type MorphAdvanceHandle } from '@/components/blob-face';
import { SongSelector } from '@/features/songs';
import { pauseJourneyMedia } from '@/components/guided/journey';
import { OpportunityFields, type OpportunitySection } from './opportunity-fields';
import './opportunity-wizard.css';

const steps: {title:string;description:string;section:OpportunitySection}[] = [
 {title:'Who are you looking for?',description:'Choose the song and the contribution you need.',section:'scope'},
 {title:'Shape the brief.',description:'Describe what a successful contribution looks like.',section:'brief'},
 {title:'Set the arrangement.',description:'Choose a royalty split or a fixed fee.',section:'compensation'},
 {title:'Choose the timing.',description:'Set availability and an optional application deadline.',section:'timing'},
 {title:'Add a reference.',description:'An optional recording helps artists understand your direction.',section:'reference'},
];
function validation(value:OfferInput,step:number) {
 if(step===0&&!['Verse','Feature','Production','Mix','Master'].includes(value.need))return 'Choose the contribution you need.';
 if(step===1&&!value.deliverable.trim())return 'Add the expected deliverable before continuing.';
 if(step===1&&value.deliverable.length>2000)return 'Keep the deliverable within 2,000 characters.';
 if(step===1&&value.requirements.length>4000)return 'Keep the requirements within 4,000 characters.';
 if(step===2){const amount=value.compensation.kind==='split'?value.compensation.percent:value.compensation.amount,max=value.compensation.kind==='split'?100:1000000;if(!Number.isFinite(amount)||amount<.01||amount>max)return value.compensation.kind==='split'?'Enter a royalty percentage between 0.01 and 100.':'Enter a fee between USD 0.01 and USD 1,000,000.';}
 if(step===3&&value.deadline&&value.deadline<new Date().toISOString().slice(0,10))return 'Choose today or a later application deadline.';
 return '';
}
export function OpportunityWizard({projectId,value,onChange,onSave,onComplete,onCancel,editing=false,disabled=false,children}:{projectId:number;value:OfferInput;onChange:(value:OfferInput)=>void;onSave:()=>Promise<void>;onComplete:()=>void;onCancel:()=>void;editing?:boolean;disabled?:boolean;children?:ReactNode}) {
 const [step,setStep]=useState(0),[error,setError]=useState(''),[pending,setPending]=useState(false),[advancing,setAdvancing]=useState(false);
 const form=useRef<HTMLFormElement>(null),heading=useRef<HTMLHeadingElement>(null),advance=useRef<MorphAdvanceHandle>(null),previous=useRef(0);
 const reduced=useReducedMotion(),locked=pending||advancing,last=step===steps.length-1;
 useEffect(()=>{const frame=requestAnimationFrame(()=>{heading.current?.focus({preventScroll:true});form.current?.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});});return()=>cancelAnimationFrame(frame);},[reduced]);
 useEffect(()=>{if(previous.current!==step){pauseJourneyMedia();previous.current=step;}},[step]);
 function focusStep(){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'nearest',behavior:reduced?'instant':'smooth'});}
 function change(next:number){setError('');setStep(next);}
 function validate(){
  if(disabled||pending)return 'cancel' as const;
  const failed=last?steps.findIndex((_,index)=>!!validation(value,index)):validation(value,step)?step:-1;
  if(failed<0){setError('');return true;}
  setError(validation(value,failed));if(failed!==step)setStep(failed);
  requestAnimationFrame(()=>form.current?.querySelector<HTMLElement>('input:invalid,textarea:invalid,select:invalid')?.focus({preventScroll:true}));return false;
 }
 async function attempt(){if(!last)return;setPending(true);try{await onSave();}finally{setPending(false);}}
 return <form ref={form} noValidate className="opportunity-wizard" aria-label="Offer editor" onSubmit={event=>{event.preventDefault();if(!locked)advance.current?.run();}}>
  <div className="opportunity-wizard-progress" aria-label={`Opportunity step ${step+1} of ${steps.length}`}>{steps.map((item,index)=><button type="button" key={item.section} aria-label={`Step ${index+1}: ${item.title}`} aria-current={index===step?'step':undefined} disabled={locked||index>step} onClick={()=>change(index)}><span/></button>)}</div>
  {children}
  <AnimatePresence mode="wait" initial={false} onExitComplete={focusStep}>
   <motion.div key={step} className="opportunity-wizard-step" onAnimationComplete={focusStep} initial={reduced?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={reduced?{opacity:0}:{opacity:0,y:-6}} transition={{duration:reduced?0:.16}}>
    <header><span className="sr-only">{editing?'Edit opportunity':'New opportunity'}</span><h3 ref={heading} tabIndex={-1}>{steps[step].title}</h3><p>{steps[step].description}</p></header>
    <fieldset disabled={locked} className="space-y-5">
     {step===0&&<SongSelector projectId={projectId} value={value.workId} onChange={workId=>onChange({...value,workId,referenceMediaId:null})}/>}
     <OpportunityFields section={steps[step].section} value={value} onChange={onChange} projectId={projectId} onBusy={setPending}/>
     {last&&<div className="opportunity-wizard-review"><div><span>{value.need}</span><strong>{value.compensation.kind==='split'?`${value.compensation.percent}% royalties`:`USD ${value.compensation.amount} fixed`}</strong></div><p>{value.workId?'Selected song':'Project-wide'} · {value.status==='open'?'Open':'Closed'} · {value.deadline?`Until ${value.deadline} (UTC)`:'No deadline'}</p><details><summary>Review brief and terms</summary><p className="whitespace-pre-wrap">{value.deliverable}</p>{value.requirements&&<p className="whitespace-pre-wrap">{value.requirements}</p>}</details><p>Payments and royalty arrangements are handled between artists.</p></div>}
    </fieldset>
   </motion.div>
  </AnimatePresence>
  <FieldError message={error}/>
  <MorphAdvanceButton ref={advance} onBeforeAdvance={validate} onAttempt={attempt} onError={failure=>setError(failure instanceof Error?failure.message:'The opportunity could not be saved. Try again.')} onAdvance={()=>{if(last)onComplete();else change(step+1);}} onPendingChange={setAdvancing} disabled={pending||disabled} className="opportunity-wizard-advance" buttonClassName="opportunity-wizard-continue" faceSize={72}>{last?'Save offer':'Continue'}</MorphAdvanceButton>
  <footer className="opportunity-wizard-nav"><button type="button" disabled={locked||step===0} style={{visibility:step===0?'hidden':'visible'}} onClick={()=>change(step-1)}>Back</button><button type="button" disabled={locked} onClick={onCancel}>Cancel</button></footer>
 </form>;
}
