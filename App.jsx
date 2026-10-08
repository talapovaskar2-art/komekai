import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight, ArrowUpRight, Brain, BookOpen, ChartBar, Check, CaretLeft, CaretRight, Clock, Compass, Fire, Gear, House, Lightning, LinkSimple, Microphone, PaperPlaneRight, Pause, Play, Plus, SignOut, Sparkle, Stop, Target, TrendUp, UserCircle, WarningCircle, X } from '@phosphor-icons/react'
import { api, patch, post } from './api.js'
import { errorText, localized, strings, t } from './i18n.js'
import './app.css'
import './app-extra.css'
import './landing-upgrade.css'
import './product-refinement.css'

gsap.registerPlugin(ScrollTrigger)
const AppContext = createContext(null)
const useApp = () => useContext(AppContext)

function Button({ children, onClick, variant = 'primary', icon: Icon = ArrowUpRight, type = 'button', disabled = false, className = '' }) {
  return <button type={type} className={`k-button k-button-${variant} ${className}`} onClick={onClick} disabled={disabled}><span>{children}</span>{Icon && <span className="k-button-icon"><Icon size={17} weight="bold"/></span>}</button>
}
function LanguageSwitch() {
  const { locale, changeLocale } = useApp()
  return <div className="k-language" role="group" aria-label="Тіл / Язык"><button className={locale === 'ru' ? 'selected' : ''} onClick={() => changeLocale('ru')}>РУ</button><button className={locale === 'kk' ? 'selected' : ''} onClick={() => changeLocale('kk')}>ҚАЗ</button></div>
}
function Surface({ children, className = '' }) { return <div className={`k-surface ${className}`}><div className="k-surface-inner">{children}</div></div> }
function Kicker({ children }) { return <span className="k-kicker"><span/>{children}</span> }

export default function App() {
  const [locale, setLocale] = useState(localStorage.getItem('komekai-locale') || 'ru')
  const [user, setUser] = useState(null)
  const [state, setState] = useState(null)
  const [catalog, setCatalog] = useState([])
  const [status, setStatus] = useState({ configured: false, googleConfigured: false, apiOnline: true })
  const [view, setView] = useState('landing')
  const [subjectId, setSubjectId] = useState('math')
  const [lessonId, setLessonId] = useState('math-balance')
  const [authOpen, setAuthOpen] = useState(false)
  const [tutorMode, setTutorMode] = useState(null)
  const [booting, setBooting] = useState(true)
  const [startupError, setStartupError] = useState('')
  const [startupDetail, setStartupDetail] = useState('')
  const s = strings[locale]

  async function refreshState() {
    const next = await api('/state')
    setState(next)
    return next
  }
  async function load() {
    try {
      const [me, available] = await Promise.all([api('/me'),api('/status')])
      setStatus({ ...available, apiOnline: true })
      setStartupError('')
      setStartupDetail('')
      if (!me.user) { setUser(null); setView('landing'); return }
      setUser(me.user)
      if (me.user.role === 'parent') { const courses=await api('/catalog');setCatalog(courses.subjects);setView('parent');return }
      const [next, courses] = await Promise.all([api('/state'),api('/catalog')])
      setState(next); setCatalog(courses.subjects)
      if (next.preferences?.locale && next.preferences.locale !== locale) setLocale(next.preferences.locale)
      setView(!next.profile?.onboardingComplete ? 'onboarding' : !next.diagnostic ? 'diagnostic' : 'dashboard')
    } catch (error) { setStatus(previous => ({ ...previous, apiOnline: !['API_OFFLINE','API_RESPONSE_INVALID'].includes(error.code) })); setStartupError(error.code || 'REQUEST_FAILED'); setStartupDetail(error.detail || ''); setUser(null); setState(null); setView('landing') }
    finally { setBooting(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => { if(status.apiOnline)return;const timer=setInterval(load,5000);return()=>clearInterval(timer) }, [status.apiOnline])
  useEffect(() => {
    if (!startupError) return
    const retryOnFocus = () => { if (document.visibilityState === 'visible') load() }
    window.addEventListener('focus', retryOnFocus)
    document.addEventListener('visibilitychange', retryOnFocus)
    return () => { window.removeEventListener('focus', retryOnFocus); document.removeEventListener('visibilitychange', retryOnFocus) }
  }, [startupError])
  useEffect(() => { localStorage.setItem('komekai-locale',locale); document.documentElement.lang=locale; document.title = locale === 'kk' ? 'KomekAI — өзіңе ыңғайлы жолмен оқы' : 'KomekAI — учиться можно по-своему' }, [locale])
  useEffect(() => {
    if (booting || window.matchMedia('(prefers-reduced-motion: reduce)').matches || state?.preferences?.reduced_motion || state?.preferences?.focus_mode) return
    const items = gsap.utils.toArray('[data-reveal]')
    const animations = items.map(item => gsap.fromTo(item,{y:24,opacity:0},{y:0,opacity:1,duration:.8,ease:'power3.out',scrollTrigger:{trigger:item,start:'top 92%',once:true}}))
    if (view === 'landing' && document.querySelector('.landing-hero')) {
      animations.push(gsap.to('.hero-glow',{y:180,scale:1.25,ease:'none',scrollTrigger:{trigger:'.landing-hero',start:'top top',end:'bottom top',scrub:true}}))
      animations.push(gsap.fromTo('.feature-main',{scale:.94,rotate:-2},{scale:1,rotate:0,ease:'none',scrollTrigger:{trigger:'.landing-features',start:'top bottom',end:'center center',scrub:true}}))
    }
    return () => animations.forEach(a => { a.scrollTrigger?.kill(); a.kill() })
  }, [view, locale, booting, state?.preferences?.reduced_motion, state?.preferences?.focus_mode])
  function navigate(next) { setView(next); window.scrollTo({top:0,behavior:state?.preferences?.reduced_motion ? 'instant' : 'smooth'}) }
  function changeLocale(next) { setLocale(next); if (user) patch('/preferences',{locale:next}).then(() => { if (user.role === 'student') refreshState() }).catch(() => {}) }
  async function completeAuth(path, payload) { const result = await post(path,payload); setUser(result.user); setAuthOpen(false); await load() }
  async function logout() { await post('/auth/logout',{}); setUser(null); setState(null); setView('landing') }
  function openLesson(id) { setLessonId(id); navigate('lesson') }
  const subject = catalog.find(item => item.id === subjectId) || catalog[0]
  const lesson = catalog.flatMap(item => item.units.flatMap(unit => unit.lessons)).find(item => item.id === lessonId)
  const context = { locale, s, user, state, setState, refreshState, catalog, status, startupError, startupDetail, retry: load, view, navigate, changeLocale, openLesson, subject, subjectId, setSubjectId, lesson, lessonId, authOpen, setAuthOpen, completeAuth, logout, tutorMode, setTutorMode }
  const prefs = state?.preferences || {}
  return <AppContext.Provider value={context}><div className={`k-app ${user ? 'inside' : 'outside'} ${prefs.focus_mode && ['lesson','video'].includes(view) ? 'focus-active' : ''} text-${prefs.text_scale || 'normal'} leading-${prefs.line_spacing || 'normal'} contrast-${prefs.contrast || 'normal'} ${prefs.reduced_motion ? 'motion-reduced' : ''}`}>
    {booting ? <div className="k-loader"><span className="k-loader-mark">K<span>.</span></span><p>{s.loading}</p></div> : !user ? <><Landing/><AuthSheet/></> : user.role === 'parent' ? <ProductShell><ParentDashboard/></ProductShell> : view === 'onboarding' ? <Onboarding/> : view === 'diagnostic' ? <Diagnostic/> : view === 'profile' ? <LearningProfile/> : <ProductShell>{view === 'dashboard' ? <Dashboard/> : view === 'subjects' ? <Subjects/> : view === 'path' ? <LearningPath/> : view === 'lesson' ? <Lesson/> : view === 'video' ? <VisualLesson/> : view === 'mistakes' ? <Mistakes/> : view === 'progress' ? <Progress/> : view === 'settings' ? <Settings/> : <Dashboard/>}</ProductShell>}
    {tutorMode && <TutorDrawer/>}
  </div></AppContext.Provider>
}

function Landing() {
  const { locale, s, setAuthOpen, status, startupError, startupDetail, retry } = useApp()
  const [mode, setMode] = useState(0)
  const [activeStep, setActiveStep] = useState(0)
  const [activeNeed, setActiveNeed] = useState(0)
  return <main className="landing">
    {startupError&&<div className="api-offline" role="status"><WarningCircle size={17}/><span>{errorText(locale,startupError)}{startupDetail && <small style={{display:'block',marginTop:4}}>{startupDetail}</small>}</span><button onClick={retry}>{s.retry}</button></div>}
    <header className="landing-nav"><button className="k-logo" onClick={() => window.scrollTo({top:0,behavior:'smooth'})}>komek<span>AI</span><i>.</i></button><nav><a href="#about">{s.navAbout}</a><a href="#how">{s.navHow}</a><a href="#features">{s.navFeatures}</a><a href="#parents">{s.navParents}</a></nav><div className="landing-actions"><LanguageSwitch/><button className="landing-login" onClick={() => setAuthOpen('login')}>{s.signIn}</button><Button onClick={() => setAuthOpen('register')} variant="lavender" icon={ArrowRight}>{s.start}</Button></div></header>
    <section className="landing-hero"><div className="landing-hero-copy" data-reveal><Kicker>KomekAI</Kicker><h1>{s.landingHeadlineA}<br/><em>{s.landingHeadlineB}</em></h1><p>{s.landingLead}</p><div className="landing-hero-actions"><Button onClick={() => setAuthOpen('register')} variant="lavender" icon={ArrowRight}>{s.start}</Button><a href="#about" className="landing-text-link">{s.learnMore}<ArrowUpRight size={19}/></a></div></div><div className="adaptive-core" data-reveal><div className="core-orbit orbit-outer"/><div className="core-orbit orbit-inner"/><div className="core-center"><span>{s.coreQuestion}</span><small>KomekAI</small></div>{s.modes.map((label,i) => <button key={label} className={`core-node node-${i} ${mode===i?'active':''}`} onClick={() => setMode(i)}>{label}</button>)}<div className="core-preview" key={mode}><span>{s.modes[mode]}</span>{mode === 0 ? <div className="core-steps">{s.coreStep.map(step => <b key={step}>{step}</b>)}</div> : <p>{[null,s.coreVisual,s.coreExample,s.coreShort][mode]}</p>}</div></div><div className="hero-glow"/></section>
    <section id="about" className="landing-philosophy" data-reveal><Kicker>{s.navAbout}</Kicker><h2>{s.philosophyA}<br/><em>{s.philosophyB}</em></h2><p>{s.philosophyLead}</p></section>
    <section id="how" className="landing-process"><div className="process-intro" data-reveal><div><Kicker>{s.navHow}</Kicker><h2>{s.processTitle}</h2><p>{s.processLead}</p></div><span className="process-index">0{activeStep+1} / 0{s.process.length}</span></div><div className="process-experience" data-reveal><div className="process-steps">{s.process.map((step,i)=><button key={step} className={activeStep===i?'active':''} aria-pressed={activeStep===i} onClick={()=>setActiveStep(i)}><span>0{i+1}</span><strong>{step}</strong><ArrowUpRight size={17}/></button>)}</div><div className="process-scene" key={activeStep}><div className="process-scene-top"><span>KomekAI / 0{activeStep+1}</span><Sparkle size={21}/></div><div className="scene-orbit orbit-a"/><div className="scene-orbit orbit-b"/><div className="scene-content"><small>{s.process[activeStep]}</small><h3>{s.processDetails[activeStep].title}</h3><p>{s.processDetails[activeStep].text}</p><div className="scene-meter"><span style={{width:`${(activeStep+1)/s.process.length*100}%`}}/></div></div></div></div></section>
    <section className="learning-needs" data-reveal><div className="needs-heading"><Kicker>{s.needsKicker}</Kicker><h2>{s.needsTitle}</h2><p>{s.needsLead}</p></div><div className="needs-body"><div className="needs-list">{s.needs.map((item,i)=><button key={item.label} className={activeNeed===i?'active':''} aria-pressed={activeNeed===i} onClick={()=>setActiveNeed(i)}><span>0{i+1}</span><strong>{item.label}</strong><ArrowUpRight size={20}/></button>)}</div><div className="needs-example" key={activeNeed}><div className="needs-example-head"><span>{s.needsExample}</span><span>0{activeNeed+1} / 03</span></div><div className="needs-focus-symbol">{activeNeed===0?<Target size={38} weight="thin"/>:activeNeed===1?<BookOpen size={38} weight="thin"/>:<Compass size={38} weight="thin"/>}</div><h3>{s.needs[activeNeed].title}</h3><p>{s.needs[activeNeed].description}</p><div className="needs-treatment"><Check size={17}/>{s.needs[activeNeed].change}</div></div></div><p className="needs-disclaimer"><WarningCircle size={18}/>{s.nonMedical}</p></section>
    <section id="features" className="landing-features" data-reveal><div><Kicker>{s.navFeatures}</Kicker><h2>{s.previewTitle}</h2><p>{s.previewLead}</p></div><div className="feature-stage"><div className="feature-main"><div className="stage-lesson"><div className="feature-leaf"><span/></div><span>{s.featureDemoTitle}</span><small>{s.featureDemoStep}</small><div>{s.featureDemoResult}<ArrowRight size={20}/></div></div></div><div className="feature-notes">{s.previewItems.map((item,i)=><div key={item}><span>0{i+1}</span><strong>{item}</strong><Sparkle size={18}/></div>)}</div></div></section>
    <section id="parents" className="landing-parent" data-reveal><Kicker>{s.navParents}</Kicker><h2>{s.parentLanding}</h2><p>{s.parentLandingLead}</p></section>
    <section className="landing-end" data-reveal><h2>{s.finalCta}</h2><Button onClick={() => setAuthOpen('register')} variant="lavender" icon={ArrowRight}>{s.start}</Button></section>
    <footer className="landing-footer"><span>komekAI.</span><p>{s.tagline}</p><LanguageSwitch/></footer>
  </main>
}

function AuthSheet() {
  const { locale, s, authOpen, setAuthOpen, completeAuth, status } = useApp()
  const [mode,setMode] = useState('register')
  const [role,setRole] = useState('student')
  const [form,setForm] = useState({firstName:'',lastName:'',email:'',password:''})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  useEffect(() => { if (authOpen) { setMode(authOpen); setError('') } },[authOpen])
  if (!authOpen) return null
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('')
    try { await completeAuth(mode === 'login' ? '/auth/login' : '/auth/register', mode === 'login' ? {email:form.email,password:form.password} : {...form,role}) }
    catch (err) { setError(errorText(locale,err.code)) }
    finally { setBusy(false) }
  }
  return <div className="sheet-layer"><button className="sheet-scrim" onClick={() => setAuthOpen(false)} aria-label={s.close}/><section className="auth-sheet" role="dialog" aria-modal="true" aria-label={s.authTitle}><button className="sheet-close" onClick={() => setAuthOpen(false)} aria-label={s.close}><X size={22}/></button><div className="auth-symbol"><Sparkle size={28} weight="fill"/></div><Kicker>KomekAI</Kicker><h2>{s.authTitle}</h2><p>{s.authLead}</p>{mode === 'register' && <div className="role-toggle"><button className={role==='student'?'selected':''} onClick={() => setRole('student')}>{s.roleStudent}</button><button className={role==='parent'?'selected':''} onClick={() => setRole('parent')}>{s.roleParent}</button></div>}
    {status.googleConfigured ? <a className="google-button" href={`/api/auth/google?role=${role}`}><span>G</span>{s.continueGoogle}</a> : <div className="google-button disabled"><span>G</span>{s.continueGoogle}<small>{s.googleUnavailable}</small></div>}
    <div className="auth-divider"><span>{s.registerEmail}</span></div><form onSubmit={submit}>{mode==='register'&&<div className="auth-name-row"><label>{s.firstName}<input required value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label><label>{s.lastName}<input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label></div>}<label>{s.email}<input type="email" required value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>{s.password}<input type="password" minLength={8} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder={s.passwordHint}/></label>{error&&<p className="form-error" role="alert">{error}</p>}<Button type="submit" disabled={busy} variant="lavender" icon={ArrowRight}>{busy?s.loading:mode==='login'?s.logIn:s.createAccount}</Button></form><button className="auth-swap" onClick={()=>{setMode(mode==='login'?'register':'login');setError('')}}>{mode==='login'?s.needAccount:s.haveAccount}</button></section></div>
}

function JourneyFrame({ children, step, total, title, lead, onBack }) {
  const { s } = useApp()
  return <main className="journey"><header className="journey-top"><span className="k-logo">komek<span>AI</span><i>.</i></span><LanguageSwitch/></header><div className="journey-progress"><span style={{width:`${Math.round(step/total*100)}%`}}/></div><div className="journey-body">{onBack&&<button className="journey-back" onClick={onBack}><CaretLeft size={18}/>{s.back}</button>}<Kicker>{step} / {total}</Kicker><h1>{title}</h1><p className="journey-lead">{lead}</p>{children}</div></main>
}

function Onboarding() {
  const { locale,s,user,navigate,refreshState } = useApp()
  const [step,setStep] = useState(0)
  const [form,setForm] = useState({firstName:user.firstName,lastName:user.lastName,age:'',grade:'',conditions:[],difficulties:[],preferredFormat:'step'})
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const toggle=(field,value)=>setForm(previous=>({...previous,[field]:previous[field].includes(value)?previous[field].filter(x=>x!==value):[...previous[field],value]}))
  async function next() {
    if (step===0 && (!form.firstName.trim() || !form.age || !form.grade)) { setError(s.errorGeneric); return }
    setError('')
    if (step<3) { setStep(step+1); return }
    setBusy(true)
    try { await post('/onboarding',{...form,age:Number(form.age),grade:Number(form.grade)}); await refreshState(); navigate('diagnostic') }
    catch(err) { setError(errorText(locale,err.code)) }
    finally { setBusy(false) }
  }
  return <JourneyFrame step={step+1} total={4} title={step===0?s.onboardingTitle:step===1?s.knownNeeds:step===2?s.hardThings:s.preferredQuestion} lead={step===0?s.onboardingLead:step===1?s.selectAny:step===2?s.selectAny:s.onboardingLead} onBack={step>0?()=>setStep(step-1):null}>
    {step===0&&<div className="journey-form"><label>{s.firstName}<input value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})}/></label><label>{s.lastName}<input value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})}/></label><div><label>{s.age}<input type="number" min="6" max="21" value={form.age} onChange={e=>setForm({...form,age:e.target.value})}/></label><label>{s.grade}<input type="number" min="1" max="12" value={form.grade} onChange={e=>setForm({...form,grade:e.target.value})}/></label></div></div>}
    {step===1&&<><div className="choice-grid">{s.conditions.map((item,i)=><button key={item} className={form.conditions.includes(String(i))?'chosen':''} onClick={()=>toggle('conditions',String(i))}>{item}{form.conditions.includes(String(i))&&<Check size={18}/>}</button>)}</div><p className="non-medical"><WarningCircle size={18}/>{s.nonMedical}</p></>}
    {step===2&&<div className="choice-grid">{s.difficulties.map((item,i)=><button key={item} className={form.difficulties.includes(String(i))?'chosen':''} onClick={()=>toggle('difficulties',String(i))}>{item}{form.difficulties.includes(String(i))&&<Check size={18}/>}</button>)}</div>}
    {step===3&&<div className="format-list">{['step','visual','example'].map((value,i)=><button key={value} className={form.preferredFormat===value?'chosen':''} onClick={()=>setForm({...form,preferredFormat:value})}><span>0{i+1}</span><strong>{s.preferredModes[i]}</strong>{form.preferredFormat===value&&<Check size={19}/>}</button>)}</div>}
    {error&&<p className="form-error" role="alert">{error}</p>}<div className="journey-actions"><Button onClick={next} disabled={busy} icon={ArrowRight}>{step===3?s.beginDiagnostic:s.continue}</Button>{(step===1||step===2)&&<button className="quiet-link" onClick={()=>setStep(step+1)}>{s.skip}</button>}</div>
  </JourneyFrame>
}

function Diagnostic() {
  const { locale,s,navigate,refreshState } = useApp()
  const [questions,setQuestions] = useState([])
  const [index,setIndex] = useState(0)
  const [answers,setAnswers] = useState([])
  const [choice,setChoice] = useState(null)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const started = useRef(Date.now())
  useEffect(()=>{api('/diagnostic/questions').then(data=>setQuestions(data.questions)).catch(()=>setError(s.errorGeneric))},[])
  const question=questions[index]
  async function next() {
    if(choice===null)return
    const updated=[...answers,{id:question.id,choice,durationMs:Date.now()-started.current}]
    setAnswers(updated);setChoice(null);started.current=Date.now()
    if(index<questions.length-1){setIndex(index+1);return}
    setBusy(true)
    try{await post('/diagnostic',{answers:updated});await refreshState();navigate('profile')}
    catch(err){setError(errorText(locale,err.code))}
    finally{setBusy(false)}
  }
  return <JourneyFrame step={index+1} total={questions.length||8} title={s.diagnosticTitle} lead={s.diagnosticLead}><div className="diagnostic-box"><span>{s.question} {index+1} {s.of} {questions.length||8}</span><h2>{question?localized(question.prompt,locale):s.loading}</h2><div className="diagnostic-options">{question?.options.map((option,i)=><button key={i} className={choice===i?'chosen':''} onClick={()=>setChoice(i)}><span>{String.fromCharCode(65+i)}</span>{localized(option,locale)}{choice===i&&<Check size={18}/>}</button>)}</div>{error&&<p className="form-error" role="alert">{error}</p>}<Button disabled={choice===null||busy} onClick={next} icon={ArrowRight}>{index===questions.length-1?s.seeProfile:s.nextQuestion}</Button></div></JourneyFrame>
}

const domainLabels={ru:{math:'Математика',reading:'Понимание текста',attention:'Инструкции',science:'Естествознание',language:'Язык',english:'Английский язык'},kk:{math:'Математика',reading:'Мәтінді түсіну',attention:'Нұсқаулар',science:'Жаратылыстану',language:'Тіл',english:'Ағылшын тілі'}}
function LearningProfile() {
  const { locale,s,state,navigate }=useApp()
  const profile=state?.diagnostic
  const preference=profile?.preferredFormat || 'step'
  return <JourneyFrame step={4} total={4} title={s.profileTitle} lead={s.profileLead}><div className="learning-profile"><div className="profile-score"><strong>{profile?.score ?? 0}<small> / 7</small></strong><span>{s.scoreLabel}</span></div><div><span>{s.preferredFormat}</span><strong>{preference==='visual'?s.formatVisual:preference==='example'?s.formatExample:s.formatStep}</strong></div><div><span>{s.lessonLength}</span><strong>{profile?.lessonMinutes||10} {s.minutes}</strong></div><div><span>{s.pace}</span><strong>{profile?.pace==='gentle'?s.gentle:s.steady}</strong></div></div><div className="profile-gaps"><h2>{s.knowledgeGaps}</h2><p>{profile?.knowledgeGaps?.length?profile.knowledgeGaps.map(item=>domainLabels[locale][item]||item).join(' · '):s.noGaps}</p></div><Button onClick={()=>navigate('dashboard')} icon={ArrowRight}>{s.beginPath}</Button></JourneyFrame>
}

function ProductShell({children}) {
  const {locale,s,user,view,navigate,setTutorMode,logout,state}=useApp()
  const studentLinks=[['dashboard',House,s.navToday],['subjects',BookOpen,s.navSubjects],['path',Compass,s.navPath],['mistakes',Target,s.navMistakes],['progress',ChartBar,s.navProgress],['settings',Gear,s.navSettings]]
  const links=user.role==='parent'?[['parent',UserCircle,s.navParent]]:studentLinks
  const focus=state?.preferences?.focus_mode
  return <div className="product"><a className="skip-link" href="#main-content">{s.continue}</a><aside className="product-side"><button className="k-logo" onClick={()=>navigate(user.role==='parent'?'parent':'dashboard')}>komek<span>AI</span><i>.</i></button><nav aria-label={s.navToday}>{links.map(([id,Icon,label])=><button className={view===id?'active':''} onClick={()=>navigate(id)} key={id}><Icon size={20} weight={view===id?'fill':'regular'}/><span>{label}</span></button>)}</nav><div className="side-end">{user.role==='student'&&!focus&&<button className="assistant-entry" onClick={()=>setTutorMode('assistant')}><Sparkle size={20} weight="fill"/><span>{s.assistant}</span><ArrowUpRight size={17}/></button>}<button className="side-logout" onClick={logout}><SignOut size={18}/>{s.logOut}</button></div></aside><div className="product-main"><header className="product-top"><div className="product-top-left"><span className="product-page-name">{user.role==='parent'?s.parentTitle:links.find(([id])=>id===view)?.[2]||s.navToday}</span></div><div className="product-top-right"><LanguageSwitch/>{user.role==='student'&&<button className="top-tutor" onClick={()=>setTutorMode('tutor')}><Sparkle size={18}/>{s.tutor}</button>}<span className="product-avatar" aria-label={s.profile}>{user.firstName?.slice(0,1).toUpperCase()}</span></div></header><main id="main-content" className="product-content">{children}</main><footer className="product-footer"><span>komekAI.</span><small>{s.tagline}</small></footer></div><nav className="mobile-product-nav" aria-label={s.navToday}>{links.map(([id,Icon,label])=><button key={id} className={view===id?'active':''} onClick={()=>navigate(id)}><Icon size={21} weight={view===id?'fill':'regular'}/><span>{label}</span></button>)}{user.role==='parent'&&<button onClick={logout}><SignOut size={21}/><span>{s.logOut}</span></button>}</nav></div>
}

function subjectLessons(subject) { return subject?.units?.flatMap(unit=>unit.lessons)||[] }
function subjectProgress(state,subject) { const lessons=subjectLessons(subject); const done=lessons.filter(item=>state?.progress?.some(p=>p.lesson_id===item.id&&p.status==='completed')).length; return {done,total:lessons.length,percent:lessons.length?Math.round(done/lessons.length*100):0} }
function recommendedLesson(catalog,state) {
  const completed=new Set((state?.progress||[]).filter(p=>p.status==='completed').map(p=>p.lesson_id))
  const needs=new Set((state?.progress||[]).filter(p=>p.status==='needs-practice').map(p=>p.lesson_id))
  for(const subject of catalog){const lesson=subjectLessons(subject).find(item=>needs.has(item.id));if(lesson)return {subject,lesson}}
  const gaps=state?.diagnostic?.knowledgeGaps||[]
  const mapped={math:'math',science:'science',language:'kazakh',english:'english',reading:'russian',attention:'russian'}
  for(const gap of gaps){const subject=catalog.find(item=>item.id===mapped[gap]);const lesson=subjectLessons(subject).find(item=>!completed.has(item.id));if(lesson)return {subject,lesson}}
  for(const subject of catalog){const lesson=subjectLessons(subject).find(item=>!completed.has(item.id));if(lesson)return {subject,lesson}}
  const subject=catalog[0];return {subject,lesson:subjectLessons(subject)[0]}
}

function Dashboard() {
  const {locale,s,user,state,catalog,navigate,openLesson,setSubjectId}=useApp()
  const {subject,lesson}=recommendedLesson(catalog,state)
  const completed=(state?.progress||[]).filter(item=>item.status==='completed').length
  const xp=state?.stats?.xp||0,streak=state?.stats?.streak||0,level=state?.stats?.level||1
  const thisWeek=(state?.attempts||[]).filter(item=>Date.now()-new Date(item.created_at+'Z').getTime()<7*86400000).length
  const queue=catalog.filter(item=>item.id!==subject?.id).slice(0,2).map(item=>({subject:item,lesson:subjectLessons(item).find(x=>!state?.progress?.some(p=>p.lesson_id===x.id&&p.status==='completed'))||subjectLessons(item)[0]}))
  return <div className="dashboard-page"><div className="dashboard-hero" data-reveal><div><Kicker>{s.hello}, {user.firstName}</Kicker><h1>{completed?s.todayLead:s.firstStep}</h1><p>{completed?s.todayPlan:s.firstStepLead}</p><Button onClick={()=>lesson&&openLesson(lesson.id)} icon={ArrowRight}>{s.continueLearning}</Button></div><div className="dashboard-hero-art" aria-hidden="true"><div className="art-ring one"/><div className="art-ring two"/><div className="art-note"><span>{localized(lesson?.title,locale)||'KomekAI'}</span><b>01 <ArrowRight size={21}/> 02</b></div><div className="art-spark">✳</div></div></div>
    <div className="day-layout"><section className="day-plan" data-reveal><div className="page-section-head"><div><Kicker>{s.recommended}</Kicker><h2>{s.todayPlan}</h2></div><button className="inline-arrow" onClick={()=>navigate('subjects')}>{s.allSubjects}<ArrowUpRight size={18}/></button></div>{lesson&&<Surface className="recommended-card"><div className="recommended-content"><span className="mini-label">{localized(subject?.title,locale)} · {lesson.minutes} {s.minutes}</span><h3>{localized(lesson.title,locale)}</h3><p>{localized(lesson.theory,locale)}</p><Button onClick={()=>openLesson(lesson.id)} variant="soft" icon={ArrowRight}>{s.openLesson}</Button></div><div className="recommended-visual"><div className="visual-arc"/><span>{subject?.id==='math'?'3x + 6 = 15':localized(subject?.title,locale)}</span></div></Surface>}{queue.map(item=><button key={item.subject.id} className="day-queue-row" onClick={()=>openLesson(item.lesson.id)}><span>{localized(item.subject.title,locale)}<small>{item.lesson.minutes} {s.minutes}</small></span><strong>{localized(item.lesson.title,locale)}</strong><ArrowUpRight size={18}/></button>)}</section><aside className="day-stats" data-reveal><Kicker>{s.progressTitle}</Kicker><div className="stats-row"><div><strong>{xp}</strong><span>{s.xp}</span></div><div><strong>{level}</strong><span>{s.level}</span></div></div><div className="xp-line"><span style={{width:`${xp%150/150*100}%`}}/></div><div className="streak-line"><Fire size={22} weight="fill"/><strong>{streak}</strong><span>{s.streak}</span></div>{!streak&&<p>{s.noStreak}</p>}<div className="weekly-goal"><div><span>{s.weeklyGoal}</span><strong>{Math.min(thisWeek,5)} / 5</strong></div><div><span style={{width:`${Math.min(thisWeek,5)*20}%`}}/></div></div></aside></div>
    <DashboardCompanion/><section className="subject-section" data-reveal><div className="page-section-head"><div><Kicker>{s.navSubjects}</Kicker><h2>{s.allSubjects}</h2><p>{s.allSubjectsLead}</p></div></div><div className="subject-strip">{catalog.map(item=>{const progress=subjectProgress(state,item);return <button key={item.id} className="subject-tile" onClick={()=>{setSubjectId(item.id);navigate('path')}} style={{'--subject-accent':item.accent}}><div className="subject-symbol"><BookOpen size={24}/></div><strong>{localized(item.title,locale)}</strong><small>{progress.done} / {progress.total} {s.lessons}</small><div className="subject-track"><span style={{width:`${progress.percent}%`}}/></div><ArrowUpRight size={18}/></button>})}</div></section></div>
}

function DashboardCompanion() {
  const {locale,s,state,navigate,setTutorMode,refreshState}=useApp()
  const copy=locale==='kk'?{rhythm:'Өзіңе ыңғайлы ырғақ',week:'Соңғы жеті күн',activity:'Оқу белсенділігі',format:'Түсіндіру тәсілі',time:'Қысқа сабақ',tools:'Қазір не көмектеседі?',path:'Бағытымды көру',pathLead:'Келесі тақырыпты таңда',mistakes:'Қиын жерді қайталау',mistakesLead:'Қателерден жаңа түсінік',help:'Көмекшіні ашу',helpLead:'Сабақ пен баптауды табу',focus:'Зейін режимі'}:{rhythm:'В твоём ритме',week:'Последние семь дней',activity:'Учебная активность',format:'Способ объяснения',time:'Короткий урок',tools:'Что поможет сейчас?',path:'Посмотреть маршрут',pathLead:'Выбери следующую тему',mistakes:'Повторить сложное',mistakesLead:'Преврати ошибку в понимание',help:'Открыть помощника',helpLead:'Найди урок или настройку',focus:'Режим фокуса'}
  const profile=state?.profile?.learningProfile||state?.diagnostic||{}
  const format=state?.preferences?.preferred_format||'step'
  const days=Array.from({length:7},(_,i)=>{const date=new Date();date.setDate(date.getDate()-6+i);const iso=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);return {date,iso,count:(state?.attempts||[]).filter(item=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qyzylorda',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.created_at+'Z'))===iso).length}})
  const tools=[[Compass,copy.path,copy.pathLead,()=>navigate('path')],[Target,copy.mistakes,copy.mistakesLead,()=>navigate('mistakes')],[Sparkle,copy.help,copy.helpLead,()=>setTutorMode('assistant')]]
  return <section className="dashboard-companion" data-reveal><div className="learning-rhythm"><div className="rhythm-heading"><Kicker>{copy.rhythm}</Kicker><button onClick={()=>navigate('settings')} aria-label={s.navSettings}><Gear size={19}/></button></div><div className="rhythm-preferences"><div><small>{copy.format}</small><strong>{format==='visual'?s.formatVisual:format==='example'?s.formatExample:s.formatStep}</strong></div><div><small>{copy.time}</small><strong>{profile.lessonMinutes||10} {s.minutes}</strong></div></div><button className={`rhythm-focus ${state?.preferences?.focus_mode?'on':''}`} onClick={()=>patch('/preferences',{focus_mode:!state?.preferences?.focus_mode}).then(refreshState)}><Target size={18}/><span>{copy.focus}</span><span className="rhythm-toggle"><i/></span></button></div><div className="week-activity"><div className="week-heading"><span>{copy.week}</span><button className="inline-arrow" onClick={()=>navigate('progress')}>{s.navProgress}<ArrowUpRight size={16}/></button></div><h3>{copy.activity}</h3><div className="week-columns">{days.map((day,i)=><div key={day.iso} className={day.count?'active':''} title={`${day.iso}: ${day.count}`}><div><span style={{height:day.count?`${Math.min(100,25+day.count*20)}%`:'5%'}}/></div><small>{new Intl.DateTimeFormat(locale==='kk'?'kk-KZ':'ru-RU',{weekday:'short'}).format(day.date)}</small>{i===6&&<i/>}</div>)}</div></div><div className="dashboard-tools"><h3>{copy.tools}</h3>{tools.map(([Icon,title,lead,action])=><button key={title} onClick={action}><span className="tool-symbol"><Icon size={20}/></span><span><strong>{title}</strong><small>{lead}</small></span><ArrowUpRight size={17}/></button>)}</div></section>
}

function Subjects() {
  const {locale,s,catalog,state,setSubjectId,navigate}=useApp()
  return <div className="inner-product-page"><PageHead kicker={s.navSubjects} title={s.allSubjects} lead={s.allSubjectsLead}/><div className="subjects-grid">{catalog.map((subject,i)=>{const progress=subjectProgress(state,subject);return <button key={subject.id} className="full-subject-card" onClick={()=>{setSubjectId(subject.id);navigate('path')}} style={{'--subject-accent':subject.accent}} data-reveal><div className="full-subject-top"><span>0{i+1}</span><ArrowUpRight size={20}/></div><div className="subject-big-symbol"><BookOpen size={46} weight="thin"/></div><h2>{localized(subject.title,locale)}</h2><p>{localized(subject.description,locale)}</p><div className="subject-card-foot"><span>{progress.done} / {progress.total} {s.lessons}</span><div><span style={{width:`${progress.percent}%`}}/></div></div></button>})}</div></div>
}

function PageHead({kicker,title,lead}) {return <div className="inner-page-head" data-reveal><Kicker>{kicker}</Kicker><h1>{title}</h1><p>{lead}</p></div>}
function LearningPath() {
  const {locale,s,catalog,state,subject,subjectId,setSubjectId,openLesson}=useApp()
  const active=subject||catalog[0]
  const lessons=subjectLessons(active)
  const progress=subjectProgress(state,active)
  return <div className="inner-product-page"><PageHead kicker={s.navPath} title={s.pathTitle} lead={s.pathLead}/><div className="subject-tabs">{catalog.map(item=><button key={item.id} className={active?.id===item.id?'selected':''} onClick={()=>setSubjectId(item.id)}>{localized(item.title,locale)}</button>)}</div><div className="path-summary"><div><span>{s.subject}</span><strong>{localized(active?.title,locale)}</strong></div><div className="path-percent"><strong>{progress.percent}%</strong><span>{s.completed}</span></div><div className="path-track"><span style={{width:`${progress.percent}%`}}/></div></div><div className="lesson-path">{lessons.map((lesson,i)=>{const record=state?.progress?.find(item=>item.lesson_id===lesson.id);const done=record?.status==='completed';const needs=record?.status==='needs-practice';return <div className={`lesson-path-row ${done?'done':needs?'needs':'current'}`} key={lesson.id} data-reveal><div className="path-index">{done?<Check size={22} weight="bold"/>:String(i+1).padStart(2,'0')}</div><div className="path-body"><div><span>{done?s.completed:needs?s.needsPractice:i===0||subjectProgress(state,active).done>=i?s.current:s.locked}</span><h2>{localized(lesson.title,locale)}</h2><p>{localized(lesson.theory,locale)}</p><small><Clock size={15}/>{lesson.minutes} {s.minutes}</small></div><Button onClick={()=>openLesson(lesson.id)} variant={needs?'outline':'primary'} icon={ArrowRight}>{needs?s.practice:s.openLesson}</Button></div></div>})}</div></div>
}

function Lesson() {
  const {locale,s,lesson,lessonId,state,refreshState,navigate,setTutorMode,openLesson,catalog}=useApp()
  const [format,setFormat]=useState(state?.preferences?.preferred_format||'step')
  const [answer,setAnswer]=useState('')
  const [order,setOrder]=useState([])
  const [feedback,setFeedback]=useState(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [explanation,setExplanation]=useState('')
  const [recording,setRecording]=useState(false)
  const [transcribing,setTranscribing]=useState(false)
  const recorder=useRef(null),media=useRef(null),started=useRef(Date.now())
  useEffect(()=>{setAnswer('');setOrder([]);setFeedback(null);setExplanation('');setFormat(state?.preferences?.preferred_format||'step');started.current=Date.now()},[lessonId])
  if(!lesson)return <div className="inner-product-page"><PageHead kicker={s.navSubjects} title={s.loading}/></div>
  const exercise=lesson.exercise
  const subject=catalog.find(item=>item.id===lesson.subjectId)||catalog.find(item=>item.units.some(unit=>unit.lessons.some(x=>x.id===lesson.id)))
  const options=exercise.options||[]
  const currentAnswer=exercise.type==='order'?order:answer
  const next=subjectLessons(subject).find((item,i,items)=>i>items.findIndex(x=>x.id===lesson.id))
  async function submit() {
    setBusy(true);setError('')
    try{const result=await post('/attempt',{lessonId:lesson.id,exerciseId:exercise.id,answer:currentAnswer,durationMs:Date.now()-started.current});setFeedback(result);if(result.recommendedFormat)setFormat(result.recommendedFormat);await refreshState()}
    catch(err){setError(errorText(locale,err.code))}
    finally{setBusy(false)}
  }
  async function switchFormat(value) {setFormat(value);patch('/preferences',{preferred_format:value}).then(()=>refreshState()).catch(()=>{})}
  async function toggleRecord() {
    if(recording){recorder.current?.stop();setRecording(false);return}
    try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});media.current=stream;const mime=['audio/webm;codecs=opus','audio/webm','audio/mp4'].find(x=>MediaRecorder.isTypeSupported(x));const chunks=[];const rec=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);recorder.current=rec;rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};rec.onstop=async()=>{stream.getTracks().forEach(track=>track.stop());setTranscribing(true);try{const blob=new Blob(chunks,{type:rec.mimeType||'audio/webm'});const result=await api('/transcribe',{method:'POST',body:blob,headers:{'Content-Type':blob.type}});setExplanation(x=>[x,result.text].filter(Boolean).join(' '))}catch(err){setError(errorText(locale,err.code))}finally{setTranscribing(false)}};rec.start();setRecording(true);setError('')}
    catch{setError(s.microphoneError)}
  }
  return <div className="lesson-page"><button className="back-link" onClick={()=>navigate('path')}><CaretLeft size={18}/>{s.navPath}</button><div className="lesson-top"><div><Kicker>{localized(subject?.title,locale)} · {lesson.minutes} {s.minutes}</Kicker><h1>{localized(lesson.title,locale)}</h1></div><button className="focus-toggle" onClick={()=>patch('/preferences',{focus_mode:!state?.preferences?.focus_mode}).then(refreshState)}><Target size={19}/>{s.focusMode}: {state?.preferences?.focus_mode?s.close:s.start}</button></div><div className="lesson-layout"><section className="lesson-main"><div className="lesson-format-controls"><span>{s.chooseFormat}</span><div>{['step','visual','example'].map((value,i)=><button key={value} className={format===value?'selected':''} onClick={()=>switchFormat(value)}>{s.explanationModes[[1,2,3][i]]}</button>)}</div></div><Surface className="theory-surface"><Kicker>{s.lessonIntro}</Kicker>{format==='step'?<><h2>{localized(lesson.theory,locale)}</h2><div className="theory-steps">{lesson.video.map((step,i)=><div key={i}><span>{String(i+1).padStart(2,'0')}</span><p>{localized(step,locale)}</p></div>)}</div></>:format==='visual'?<><div className="visual-equation"><span>{localized(lesson.example,locale)}</span><div className="visual-bars"><i/><i/><i/></div></div><p>{s.visualText} {localized(lesson.theory,locale)}</p></>:<><h2>{localized(lesson.example,locale)}</h2><p>{localized(lesson.theory,locale)}</p></>}</Surface><div className="lesson-video-entry"><div><Play size={21} weight="fill"/><span><strong>{s.videoLesson}</strong><small>{s.videoLead}</small></span></div><button onClick={()=>navigate('video')}><ArrowUpRight size={20}/></button></div><Surface className="exercise-surface"><Kicker>{s.exercise}</Kicker><h2>{localized(exercise.question,locale)}</h2>{exercise.type==='input'?<input className="exercise-input" value={answer} onChange={e=>{setAnswer(e.target.value);setFeedback(null)}} placeholder={s.inputAnswer} aria-label={s.inputAnswer}/>:exercise.type==='choice'?<div className="exercise-options">{options.map((option,i)=><button key={i} className={answer===String(i)?'chosen':''} onClick={()=>{setAnswer(String(i));setFeedback(null)}}><span>{String.fromCharCode(65+i)}</span>{localized(option,locale)}{answer===String(i)&&<Check size={18}/>}</button>)}</div>:<><p className="order-hint">{s.orderHint}</p><div className="order-selected">{order.map((item,i)=><button key={i} onClick={()=>setOrder(order.filter((_,j)=>j!==i))}>{localized(options[Number(item)],locale)}<X size={14}/></button>)}</div><div className="order-options">{options.map((option,i)=><button key={i} disabled={order.includes(String(i))} onClick={()=>{setOrder([...order,String(i)]);setFeedback(null)}}>{localized(option,locale)}<Plus size={15}/></button>)}</div><button className="quiet-link" onClick={()=>{setOrder([]);setFeedback(null)}}>{s.clearOrder}</button></>}{feedback&&<div className={`exercise-feedback ${feedback.correct?'good':'needs'}`}><span>{feedback.correct?<Check size={20}/>:<Sparkle size={20}/>}</span><div><strong>{feedback.correct?s.correct:s.incorrect}</strong><p>{localized(feedback.explanation,locale)}</p>{feedback.recommendedFormat&&<p>{s.adaptiveHint}</p>}{feedback.xpGained>0&&<small>+{feedback.xpGained} XP</small>}</div></div>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="exercise-actions"><Button onClick={submit} disabled={busy||(exercise.type==='order'?order.length!==options.length:!String(answer).trim())} icon={ArrowRight}>{s.checkAnswer}</Button>{feedback?.correct&&next&&<button className="inline-arrow" onClick={()=>openLesson(next.id)}>{s.nextLesson}<ArrowRight size={17}/></button>}</div></Surface></section><aside className="lesson-assistance"><div className="tutor-prompt"><Sparkle size={26} weight="fill"/><h3>{s.tutor}</h3><p>{s.tutorWelcome}</p><Button variant="outline" onClick={()=>setTutorMode('tutor')} icon={ArrowUpRight}>{s.tutor}</Button></div><div className="voice-panel"><Microphone size={24}/><h3>{s.explainVoice}</h3><p>{s.explainVoiceLead}</p><button className={`record-control ${recording?'recording':''}`} onClick={toggleRecord} disabled={transcribing}>{recording?<Stop size={18} weight="fill"/>:<Microphone size={18}/>} {recording?s.stopRecording:transcribing?s.transcribing:s.record}</button><textarea value={explanation} onChange={e=>setExplanation(e.target.value)} placeholder={s.transcriptPlaceholder}/><Button variant="outline" onClick={()=>{setTutorMode('tutor');sessionStorage.setItem('komekai-draft',explanation)}} disabled={!explanation.trim()} icon={ArrowRight}>{s.sendExplanation}</Button></div></aside></div></div>
}

function VisualLesson() {
  const {locale,s,lesson,navigate,setTutorMode}=useApp()
  const [chapter,setChapter]=useState(0),[playing,setPlaying]=useState(false)
  const steps=lesson?.video||[]
  useEffect(()=>{if(!playing||!steps.length)return;const timer=setInterval(()=>setChapter(current=>{if(current>=steps.length-1){setPlaying(false);return current}return current+1}),3200);return()=>clearInterval(timer)},[playing,steps.length])
  if(!lesson)return null
  return <div className="visual-lesson-page"><button className="back-link" onClick={()=>navigate('lesson')}><CaretLeft size={18}/>{s.back}</button><PageHead kicker={s.videoLesson} title={localized(lesson.title,locale)} lead={s.videoLead}/><div className="video-layout"><div><div className="animated-player"><div className="player-orb"><span>{String(chapter+1).padStart(2,'0')}</span></div><h2>{localized(steps[chapter],locale)}</h2><div className="player-equation">{localized(lesson.example,locale)}</div><button onClick={()=>setPlaying(!playing)} aria-label={playing?s.pause:s.play}>{playing?<Pause size={23} weight="fill"/>:<Play size={23} weight="fill"/>}{playing?s.pause:s.play}</button><div className="player-progress">{steps.map((_,i)=><span key={i} className={i<=chapter?'filled':''}/>)}</div></div><button className="ask-moment" onClick={()=>{sessionStorage.setItem('komekai-draft',`${s.askAtMoment}: ${localized(steps[chapter],locale)}`);setTutorMode('tutor')}}><Sparkle size={20}/>{s.askAtMoment}<ArrowUpRight size={17}/></button></div><aside className="video-side"><h3>{s.chapters}</h3>{steps.map((step,i)=><button key={i} className={chapter===i?'active':''} onClick={()=>{setChapter(i);setPlaying(false)}}><span>{String(i+1).padStart(2,'0')}</span>{localized(step,locale)}</button>)}<h3>{s.transcript}</h3><p>{steps.map(step=>localized(step,locale)).join(' ')}</p><Button onClick={()=>navigate('lesson')} icon={ArrowRight}>{s.practiceNow}</Button></aside></div></div>
}

const mistakeNames={ru:{'inverse-operation':'Обратное действие','sign-transfer':'Знаки при переносе','cell-functions':'Части клетки','food-chain-order':'Порядок цепи питания','synonyms':'Близкие по смыслу слова','word-order':'Порядок слов','main-idea':'Главная мысль','punctuation':'Знаки препинания','past-tense':'Прошедшее время','question-order':'Порядок вопроса'},kk:{'inverse-operation':'Кері амал','sign-transfer':'Көшіру кезіндегі таңба','cell-functions':'Жасуша бөліктері','food-chain-order':'Қоректік тізбек реті','synonyms':'Мағынасы жақын сөздер','word-order':'Сөз реті','main-idea':'Негізгі ой','punctuation':'Тыныс белгілері','past-tense':'Өткен шақ','question-order':'Сұрақ реті'}}
function Mistakes() {
  const {locale,s,state,catalog,openLesson}=useApp()
  const attempts=(state?.attempts||[]).filter(item=>!item.correct)
  const grouped=Object.values(attempts.reduce((all,item)=>{const id=item.error_pattern||'other';if(!all[id])all[id]={id,count:0,lessonId:item.lesson_id};all[id].count++;return all},{}))
  return <div className="inner-product-page"><PageHead kicker={s.navMistakes} title={s.mistakesTitle} lead={s.mistakesLead}/>{grouped.length?<div className="mistake-list">{grouped.map((group,i)=>{const subject=catalog.find(subject=>subjectLessons(subject).some(item=>item.id===group.lessonId));return <div className="mistake-row" key={group.id} data-reveal><span>0{i+1}</span><div><small>{localized(subject?.title,locale)}</small><h2>{mistakeNames[locale][group.id]||group.id}</h2><p>{group.count} {s.repeats}</p></div><Button variant="outline" onClick={()=>openLesson(group.lessonId)} icon={ArrowRight}>{s.practice}</Button></div>})}</div>:<div className="empty-stage" data-reveal><div><Target size={43} weight="thin"/></div><h2>{s.noMistakes}</h2><p>{s.noMistakesLead}</p></div>}</div>
}
function Progress() {
  const {locale,s,state,catalog}=useApp()
  const attempts=state?.attempts||[]
  const correct=attempts.filter(item=>item.correct).length
  const completed=state?.progress?.filter(item=>item.status==='completed').length||0
  const stats=[{number:completed,label:s.topicsMastered},{number:attempts.length,label:s.attempts},{number:attempts.length?`${Math.round(correct/attempts.length*100)}%`:'—',label:s.accuracy}]
  return <div className="inner-product-page"><PageHead kicker={s.navProgress} title={s.progressTitle} lead={s.progressLead}/><div className="progress-stats" data-reveal>{stats.map(item=><div key={item.label}><strong>{item.number}</strong><span>{item.label}</span></div>)}</div><div className="progress-layout"><Surface className="subject-progress"><h2>{s.allSubjects}</h2>{catalog.map(subject=>{const progress=subjectProgress(state,subject);return <div className="progress-subject" key={subject.id}><div><span>{localized(subject.title,locale)}</span><strong>{progress.done}/{progress.total}</strong></div><div><span style={{width:`${progress.percent}%`,background:subject.accent}}/></div></div>})}</Surface><div className="progress-aside"><Surface><h2>{s.achievements}</h2>{state?.achievements?.length?<div className="achievement-list">{state.achievements.map(item=><div key={item.achievement_id}><Lightning size={20} weight="fill"/><strong>{item.achievement_id==='first-lesson'?s.firstLessonAchievement:s.fiveLessonsAchievement}</strong></div>)}</div>:<p>{s.firstStepLead}</p>}</Surface><Surface><h2>{s.recentActivity}</h2>{attempts.length?<div className="recent-list">{attempts.slice(0,5).map((item,i)=>{const title=catalog.flatMap(subjectLessons).find(x=>x.id===item.lesson_id)?.title;return <div key={i}><span className={item.correct?'good':'needs'}>{item.correct?<Check size={15}/>:<Target size={15}/>}</span><strong>{localized(title,locale)}</strong><small>{new Intl.DateTimeFormat(locale==='kk'?'kk-KZ':'ru-RU',{day:'numeric',month:'short'}).format(new Date(item.created_at+'Z'))}</small></div>})}</div>:<p>{s.noActivity}</p>}</Surface></div></div></div>
}

function Settings() {
  const {locale,s,state,refreshState}=useApp()
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  const prefs=state?.preferences||{}
  async function change(payload){try{await patch('/preferences',payload);await refreshState();setError('')}catch(err){setError(errorText(locale,err.code))}}
  async function createCode(){try{const result=await post('/parent/code',{});setCode(result.code)}catch(err){setError(errorText(locale,err.code))}}
  const selects=[['text_scale',s.textSize,[['normal',s.normal],['large',s.large],['extra',s.extra]]],['line_spacing',s.lineSpacing,[['normal',s.normal],['wide',s.wide]]],['contrast',s.contrast,[['normal',s.normal],['high',s.high]]]]
  return <div className="inner-product-page"><PageHead kicker={s.navSettings} title={s.settingsTitle} lead={s.settingsLead}/><div className="settings-grid"><Surface className="settings-panel"><h2>{s.settingsTitle}</h2>{selects.map(([key,label,options])=><div className="setting-row" key={key}><span>{label}</span><div>{options.map(([value,name])=><button key={value} className={prefs[key]===value?'selected':''} onClick={()=>change({[key]:value})}>{name}</button>)}</div></div>)}{[['reduced_motion',s.reducedMotion],['focus_mode',s.focusMode],['captions',s.captions]].map(([key,label])=><div className="setting-row" key={key}><span>{label}</span><button className={`setting-switch ${prefs[key]?'on':''}`} role="switch" aria-checked={Boolean(prefs[key])} aria-label={label} onClick={()=>change({[key]:!prefs[key]})}><span/></button></div>)}</Surface><Surface className="parent-link-panel"><div className="link-icon"><LinkSimple size={26}/></div><h2>{s.linkParent}</h2><p>{s.codeHint}</p><Button variant="outline" onClick={createCode} icon={ArrowRight}>{s.createCode}</Button>{code&&<div className="generated-code" aria-live="polite">{code}</div>}</Surface></div>{error&&<p className="form-error" role="alert">{error}</p>}</div>
}

function ParentSubjectProgress({child}) {
  const {locale,s,catalog}=useApp()
  return <div className="parent-subject-progress"><h3>{s.allSubjects}</h3>{catalog.map(subject=>{const progress=subjectProgress(child,subject);return <div key={subject.id}><span>{localized(subject.title,locale)}</span><div><i style={{width:`${progress.percent}%`,background:subject.accent}}/></div><strong>{progress.done} / {progress.total}</strong></div>})}</div>
}

function ParentDashboard() {
  const {locale,s,user}=useApp()
  const [children,setChildren]=useState([])
  const [code,setCode]=useState('')
  const [error,setError]=useState('')
  const [busy,setBusy]=useState(false)
  async function loadChildren(){try{const result=await api('/parent/children');setChildren(result.children);setError('')}catch(err){setError(errorText(locale,err.code))}}
  useEffect(()=>{loadChildren()},[])
  async function link(e){e.preventDefault();setBusy(true);setError('');try{await post('/parent/link',{code});setCode('');await loadChildren()}catch(err){setError(errorText(locale,err.code))}finally{setBusy(false)}}
  return <div className="inner-product-page"><PageHead kicker={s.hello+', '+user.firstName} title={s.parentTitle} lead={s.parentLead}/>{children.length?children.map(child=>{const stats=child.stats||{},attempts=child.attempts||[],progress=child.progress||[],done=progress.filter(item=>item.status==='completed').length,correct=attempts.filter(item=>item.correct).length;const errorPatterns=[...new Set(attempts.filter(item=>!item.correct).map(item=>item.error_pattern))];return <div className="parent-child" key={child.id}><div className="child-heading"><div className="child-avatar">{child.firstName.slice(0,1).toUpperCase()}</div><div><small>{s.childName}</small><h2>{child.firstName} {child.lastName}</h2></div></div><div className="parent-metrics"><div><strong>{done}</strong><span>{s.topicsMastered}</span></div><div><strong>{stats.streak||0}</strong><span>{s.streak}</span></div><div><strong>{stats.xp||0}</strong><span>{s.xp}</span></div><div><strong>{attempts.length?Math.round(correct/attempts.length*100)+'%':'—'}</strong><span>{s.accuracy}</span></div></div><div className="parent-insights"><Surface><h3>{s.parentStrengths}</h3><p>{done?`${done} ${s.topicsMastered.toLowerCase()}`:s.firstStepLead}</p></Surface><Surface><h3>{s.parentNeeds}</h3><p>{errorPatterns.length?errorPatterns.map(item=>mistakeNames[locale][item]||item).join(' · '):s.noMistakes}</p></Surface></div><ParentSubjectProgress child={child}/></div>}):<div className="parent-empty"><div className="parent-empty-icon"><LinkSimple size={35}/></div><h2>{s.parentEmpty}</h2><p>{s.parentEmptyLead}</p><form onSubmit={link}><input value={code} onChange={e=>setCode(e.target.value)} placeholder={s.enterCode} aria-label={s.enterCode} required/><Button type="submit" disabled={busy} icon={ArrowRight}>{s.linkChild}</Button></form>{error&&<p className="form-error" role="alert">{error}</p>}</div>}</div>
}

function TutorDrawer() {
  const {locale,s,tutorMode,setTutorMode,lessonId}=useApp()
  const [messages,setMessages]=useState([])
  const [input,setInput]=useState('')
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const end=useRef(null)
  useEffect(()=>{api('/tutor/history').then(data=>setMessages(data.messages.map(item=>({role:item.role,text:item.content})))).catch(()=>{});const draft=sessionStorage.getItem('komekai-draft');if(draft){setInput(draft);sessionStorage.removeItem('komekai-draft')}},[tutorMode])
  useEffect(()=>{end.current?.scrollIntoView({behavior:'smooth'})},[messages,busy])
  async function send(text=input){const message=text.trim();if(!message||busy)return;setInput('');setError('');setMessages(previous=>[...previous,{role:'user',text:message}]);setBusy(true);try{const result=await post('/tutor',{message,lessonId:tutorMode==='tutor'?lessonId:null,mode:tutorMode,locale});setMessages(previous=>[...previous,{role:'assistant',text:result.text}])}catch(err){setError(errorText(locale,err.code))}finally{setBusy(false)}}
  return <div className="tutor-layer"><button className="tutor-scrim" onClick={()=>setTutorMode(null)} aria-label={s.close}/><section className="tutor-drawer" role="dialog" aria-modal="true" aria-label={tutorMode==='tutor'?s.tutor:s.assistant}><header><div className="tutor-mark"><Sparkle size={22} weight="fill"/></div><div><strong>{tutorMode==='tutor'?s.tutor:s.assistant}</strong><small>KomekAI</small></div><button onClick={()=>setTutorMode(null)} aria-label={s.close}><X size={21}/></button></header><div className="tutor-history"><div className="message assistant">{tutorMode==='tutor'?s.tutorWelcome:s.assistantWelcome}</div>{messages.map((item,i)=><div key={i} className={`message ${item.role}`}>{item.text}</div>)}{busy&&<div className="typing"><span/><span/><span/></div>}{error&&<p className="tutor-error" role="alert">{error}</p>}<div ref={end}/></div>{messages.length===0&&<div className="quick-prompts">{(tutorMode==='tutor'?s.quickTutor:s.quickAssistant).map(prompt=><button key={prompt} onClick={()=>send(prompt)}>{prompt}<ArrowUpRight size={14}/></button>)}</div>}<form onSubmit={e=>{e.preventDefault();send()}}><input value={input} onChange={e=>setInput(e.target.value)} placeholder={s.askQuestion} aria-label={s.askQuestion}/><button disabled={!input.trim()||busy} aria-label={s.send}><PaperPlaneRight size={19} weight="fill"/></button></form></section></div>
}


