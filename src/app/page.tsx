'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase';
import { QUESTIONS, Question } from '@/lib/questions';
import { 
  Shield, 
  Clock, 
  Award, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Tv, 
  Check, 
  BookOpen, 
  ArrowRight,
  Menu,
  User,
  LogIn,
  LogOut,
  Mail,
  KeyRound,
  FileText,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';

export default function HomePage() {
  const supabase = createClient();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [mode, setMode] = useState<'practice' | 'mock' | 'mistakes' | 'account'>('practice');
  const [selectedMockId, setSelectedMockId] = useState<number>(1);
  
  // Quiz state
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [guestCount, setGuestCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [isExamCompleted, setIsExamCompleted] = useState(false);

  // Auth Modal & Notification State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authLoginIdentifier, setAuthLoginIdentifier] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Account Management State
  const [showPassword, setShowPassword] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Φόρτωση χρήστη, προφίλ και τοπικών ορίων
  useEffect(() => {
    async function initUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(prof);
      } else {
        const today = new Date().toISOString().split('T')[0];
        const savedDate = localStorage.getItem('guest_date');
        const count = parseInt(localStorage.getItem('guest_count') || '0', 10);

        if (savedDate !== today) {
          localStorage.setItem('guest_date', today);
          localStorage.setItem('guest_count', '0');
          setGuestCount(0);
        } else {
          setGuestCount(count);
        }
      }
    }
    initUser();
  }, []);

  // Έλεγχος URL για επιτυχή επιστροφή από Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      setSuccessBanner('Η συνδρομή σας ενεργοποιήθηκε επιτυχώς! Καλώς ήρθατε στο PRO.');
      setTimeout(() => setSuccessBanner(null), 6000);
    } else if (params.get('payment') === 'cancelled') {
      alert('Η διαδικασία πληρωμής ακυρώθηκε.');
    }
  }, []);

  // Λειτουργία Πληρωμής μέσω Stripe Checkout
  const handleUpgradeToPro = async () => {
    if (!user) {
      setAuthMode('signup');
      setShowAuthModal(true);
      return;
    }

    setIsUpgrading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'Σφάλμα κατά τη σύνδεση με το Stripe.');
      }
    } catch (err: any) {
      alert(err.message || 'Παρουσιάστηκε σφάλμα κατά την εκκίνηση της πληρωμής.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Auth Submit Handler
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            data: { username: authUsername }
          }
        });
        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            username: authUsername,
            subscription_status: 'free',
            daily_question_count: 0,
            ad_bonus_count: 0
          });
        }
        setShowAuthModal(false);
        setSuccessBanner('Η εγγραφή ολοκληρώθηκε επιτυχώς! Καλώς ήρθατε.');
        setTimeout(() => setSuccessBanner(null), 5000);
      } else {
        let emailToUse = authLoginIdentifier.trim();

        if (!emailToUse.includes('@')) {
          const { data: userProf, error: profErr } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', emailToUse)
            .single();

          if (profErr || !userProf) {
            throw new Error('Δεν βρέθηκε λογαριασμός με αυτό το Username.');
          }

          const { data: userEmailData } = await supabase.rpc('get_email_by_username', {
            uname: emailToUse
          });
          if (userEmailData) {
            emailToUse = userEmailData;
          }
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password: authPassword
        });
        if (error) throw error;

        setShowAuthModal(false);
        setSuccessBanner('Συνδεθήκατε επιτυχώς!');
        setTimeout(() => setSuccessBanner(null), 4000);
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        setProfile(prof);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Παρουσιάστηκε σφάλμα.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMode('practice');
  };

  const handleUpdatePassword = async () => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      alert('Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.');
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
      if (error) throw error;
      setSuccessBanner('Ο κωδικός σας ενημερώθηκε επιτυχώς!');
      setTimeout(() => setSuccessBanner(null), 4000);
      setNewPasswordInput('');
    } catch (err: any) {
      alert(err.message || 'Σφάλμα κατά την αλλαγή κωδικού.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      'Είστε απόλυτα σίγουροι ότι θέλετε να διαγράψετε τον λογαριασμό σας; Αυτή η ενέργεια είναι οριστική και μη αναστρέψιμη.'
    );
    if (!confirmDelete || !user) return;

    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setMode('practice');
      setSuccessBanner('Ο λογαριασμός σας διαγράφηκε επιτυχώς.');
      setTimeout(() => setSuccessBanner(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Σφάλμα κατά τη διαγραφή λογαριασμού.');
    }
  };

  // Mock Exam logic
  const activeQuestions: Question[] = useMemo(() => {
    if (mode === 'practice') {
      return QUESTIONS;
    }
    const shuffled = [...QUESTIONS].sort((a, b) => {
      const seedA = (a.id * 9301 + 49297 + selectedMockId * 233) % 233280;
      const seedB = (b.id * 9301 + 49297 + selectedMockId * 233) % 233280;
      return seedA - seedB;
    });
    return shuffled.slice(0, 20);
  }, [mode, selectedMockId]);

  // Χρονόμετρο 60 λεπτών
  useEffect(() => {
    if (mode === 'mock' && !isExamCompleted && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !isExamCompleted) {
      setIsExamCompleted(true);
    }
  }, [mode, timeLeft, isExamCompleted]);

  const getDailyLimit = () => {
    if (!user) return 5;
    if (profile?.subscription_status === 'pro') return 999999;
    return 20 + (profile?.ad_bonus_count || 0) * 5;
  };

  const currentQuestionsAnswered = user ? (profile?.daily_question_count || 0) : guestCount;
  const isLimitReached = mode === 'practice' && currentQuestionsAnswered >= getDailyLimit();

  const handleSelectAnswer = async (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
    setIsAnswered(true);

    const isCorrect = index === activeQuestions[currentIdx].correct;
    if (isCorrect) setScore((prev) => prev + 1);

    if (mode === 'practice') {
      if (!user) {
        const next = guestCount + 1;
        setGuestCount(next);
        localStorage.setItem('guest_count', next.toString());
      } else {
        const next = (profile?.daily_question_count || 0) + 1;
        setProfile({ ...profile, daily_question_count: next });
        await supabase
          .from('profiles')
          .update({ daily_question_count: next })
          .eq('id', user.id);
      }
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < activeQuestions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      setIsExamCompleted(true);
    }
  };

  const resetExam = (examId: number) => {
    setSelectedMockId(examId);
    setCurrentIdx(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
    setTimeLeft(60 * 60);
    setIsExamCompleted(false);
  };

  const handleWatchAd = async () => {
    if (!user || (profile?.ad_bonus_count || 0) >= 2) return;
    setSuccessBanner('Κερδίσατε +5 επιπλέον ερωτήσεις για σήμερα!');
    setTimeout(() => setSuccessBanner(null), 4000);
    const newBonus = (profile?.ad_bonus_count || 0) + 1;
    setProfile({ ...profile, ad_bonus_count: newBonus });
    await supabase
      .from('profiles')
      .update({ ad_bonus_count: newBonus })
      .eq('id', user.id);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Success Notification Banner */}
      {successBanner && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-40 pl-16">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Security Quiz</h1>
              <p className="text-xs text-slate-400">ΕΟΠΠΕΠ / ΚΕΜΕΑ (ΝΕΟ ΠΛΑΙΣΙΟ)</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMode('account')}
                  className="text-xs text-slate-200 hover:text-emerald-400 font-semibold flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  {profile?.username || user.user_metadata?.username || 'Χρήστης'}
                </button>
                <button
                  onClick={handleSignOut}
                  title="Αποσύνδεση"
                  className="text-xs text-slate-400 hover:text-rose-400 transition p-1.5 rounded-lg border border-slate-800 hover:border-rose-500/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" /> Σύνδεση
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Αναδυόμενη Αριστερή Στήλη */}
      <aside className="fixed top-0 left-0 h-screen z-50 group flex">
        <div className="w-16 hover:w-64 group-hover:w-64 transition-all duration-300 ease-in-out bg-slate-900/95 backdrop-blur-md border-r border-slate-800 p-2.5 flex flex-col justify-between overflow-hidden shadow-2xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-1 py-2 border-b border-slate-800 shrink-0">
              <div className="w-9 h-9 flex items-center justify-center shrink-0">
                <Menu className="w-5 h-5 text-emerald-400" />
              </div>
              <span className="font-bold text-sm tracking-wide text-slate-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                Μενού Πλοήγησης
              </span>
            </div>

            <nav className="flex flex-col gap-2">
              <button
                onClick={() => { setMode('practice'); setCurrentIdx(0); setIsAnswered(false); }}
                title="Quiz"
                className={`w-full h-11 px-1 rounded-xl flex items-center gap-3 transition ${
                  mode === 'practice'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Quiz
                </span>
              </button>

              <button
                onClick={() => { setMode('mock'); resetExam(1); }}
                title="Προσομοίωση Εξετάσεων"
                className={`w-full h-11 px-1 rounded-xl flex items-center justify-between transition ${
                  mode === 'mock'
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-400" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Προσομοίωση Εξετάσεων
                  </span>
                </div>
                {profile?.subscription_status !== 'pro' && (
                  <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>

              <button
                onClick={() => { setMode('mistakes'); setCurrentIdx(0); setIsAnswered(false); }}
                title="Quiz Λανθασμένων Ερωτήσεων"
                className={`w-full h-11 px-1 rounded-xl flex items-center justify-between transition ${
                  mode === 'mistakes'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5 text-rose-400" />
                  </div>
                  <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Quiz Λανθασμένων
                  </span>
                </div>
                {profile?.subscription_status !== 'pro' && (
                  <Lock className="w-3.5 h-3.5 text-amber-400/80 shrink-0 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </button>

              <button
                onClick={() => {
                  if (!user) {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  } else {
                    setMode('account');
                  }
                }}
                title="Ο Λογαριασμός μου"
                className={`w-full h-11 px-1 rounded-xl flex items-center gap-3 transition ${
                  mode === 'account'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div className="w-9 h-9 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-sky-400" />
                </div>
                <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Ο Λογαριασμός μου
                </span>
              </button>
            </nav>
          </div>

          <div className="pt-2 border-t border-slate-800 shrink-0">
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <span>KEMEA SaaS v1.0</span>
              <button 
                onClick={() => alert('Όροι Χρήσης & Προϋποθέσεις: Πλατφόρμα εκπαιδευτικής προετοιμασίας Security.')}
                className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition"
              >
                <FileText className="w-3 h-3" /> Όροι & Προϋποθέσεις
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pl-16 flex-1 flex flex-col">
        <main className="max-w-4xl mx-auto w-full px-4 py-6 flex-1 flex flex-col gap-6">
          <div className="w-full bg-slate-900 border border-dashed border-slate-800 rounded-xl py-3 text-center text-xs text-slate-500">
            Διαφήμιση Google AdSense (Top Leaderboard)
          </div>

          {/* SECTION: ΔΙΑΧΕΙΡΙΣΗ ΛΟΓΑΡΙΑΣΜΟΥ */}
          {mode === 'account' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl">
                    <User className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Διαχείριση Λογαριασμού</h2>
                    <p className="text-xs text-slate-400">Στοιχεία προφίλ, ασφάλεια και ρυθμίσεις</p>
                  </div>
                </div>
                <span className="text-xs uppercase tracking-wider font-semibold px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                  {profile?.subscription_status === 'pro' ? 'PRO Συνδρομητής' : 'Δωρεάν Λογαριασμός'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Username</span>
                  <strong className="text-base text-slate-100">{profile?.username || user?.user_metadata?.username || 'Χωρίς όνομα'}</strong>
                </div>

                <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-1">
                  <span className="text-xs text-slate-400">Email</span>
                  <strong className="text-base text-slate-100">{user?.email}</strong>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-slate-200">Κωδικός Πρόσβασης (Password)</h3>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Πληκτρολογήστε νέο κωδικό..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-sky-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition"
                      title={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword}
                    className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {isUpdatingPassword ? 'Ενημέρωση...' : 'Αλλαγή Κωδικού'}
                  </button>
                </div>
              </div>

              <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-2">
                <div>
                  <h4 className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="w-4 h-4" /> Διαγραφή Λογαριασμού
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Η οριστική διαγραφή θα αφαιρέσει τα δεδομένα και το ιστορικό σας από τη βάση δεδομένων.
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="bg-rose-600 hover:bg-rose-500 text-slate-100 font-bold px-4 py-2 rounded-xl transition text-xs shrink-0"
                >
                  Διαγραφή Λογαριασμού
                </button>
              </div>
            </div>
          ) : mode === 'mistakes' && profile?.subscription_status !== 'pro' ? (
            /* Lock Screen για Quiz Λανθασμένων Ερωτήσεων */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Quiz Λανθασμένων Ερωτήσεων (PRO)</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Αυτή η λειτουργία είναι διαθέσιμη αποκλειστικά για τους <strong>PRO συνδρομητές</strong>. Αποθηκεύει αυτόματα τις ερωτήσεις στις οποίες κάνατε λάθος ώστε να τις επαναλαμβάνετε στοχευμένα!
              </p>
              <button 
                onClick={handleUpgradeToPro}
                disabled={isUpgrading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
              >
                {isUpgrading ? 'Μεταφορά στο Ταμείο...' : 'Αναβάθμιση σε Pro (9.99€/μήνα)'}
              </button>
            </div>
          ) : mode === 'mock' && profile?.subscription_status !== 'pro' ? (
            /* Lock Screen για Mock Exams */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Ξεκλειδώστε τα 15 Πλήρη Mock Exams</h3>
              <p className="text-slate-400 text-sm max-w-md">
                Αποκτήστε πρόσβαση σε 15 ρεαλιστικές προσομοιώσεις εξετάσεων πιστοποίησης Security με 20 ερωτήσεις και χρονόμετρο 60 λεπτών, χωρίς διαφημίσεις.
              </p>
              <button 
                onClick={handleUpgradeToPro}
                disabled={isUpgrading}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
              >
                {isUpgrading ? 'Μεταφορά στο Ταμείο...' : 'Αναβάθμιση σε Pro (9.99€/μήνα)'}
              </button>
            </div>
          ) : isLimitReached ? (
            /* Lock Screen Εξάντλησης Ημερήσιου Ορίου */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
                <Award className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold">Συμπληρώσατε το ημερήσιο όριό σας!</h3>
              {!user ? (
                <>
                  <p className="text-slate-400 text-sm max-w-md">
                    Σαν Guest έχετε <strong>5 δωρεάν ερωτήσεις</strong> την ημέρα. Δημιουργήστε δωρεάν λογαριασμό για να έχετε <strong>20 ερωτήσεις καθημερινά</strong> και αποθήκευση της προόδου σας.
                  </p>
                  <button 
                    onClick={() => { setAuthMode('signup'); setShowAuthModal(true); }}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-6 py-2.5 rounded-xl transition text-sm"
                  >
                    Δημιουργία Δωρεάν Λογαριασμού
                  </button>
                </>
              ) : (profile?.ad_bonus_count || 0) < 2 ? (
                <>
                  <p className="text-slate-400 text-sm max-w-md">
                    Εξαντλήσατε τις βασικές ερωτήσεις σας. Παρακολουθήστε μια σύντομη διαφήμιση για να κερδίσετε <strong>+5 έξτρα ερωτήσεις</strong>.
                  </p>
                  <button
                    onClick={handleWatchAd}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl transition flex items-center gap-2 text-sm"
                  >
                    <Tv className="w-4 h-4" /> Προβολή Διαφήμισης (+5)
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <p className="text-slate-400 text-sm max-w-md">
                    Φτάσατε το μέγιστο όριο των <strong>30 ερωτήσεων</strong> για σήμερα. Επιστρέψτε αύριο ή αναβαθμίστε σε Pro για απεριόριστη πρόσβαση.
                  </p>
                  <button
                    onClick={handleUpgradeToPro}
                    disabled={isUpgrading}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition text-xs"
                  >
                    {isUpgrading ? 'Μεταφορά...' : 'Απεριόριστα με Pro'}
                  </button>
                </div>
              )}
            </div>
          ) : isExamCompleted ? (
            /* Οθόνη Τελικού Σκορ */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <h3 className="text-2xl font-bold">Ολοκληρώθηκε!</h3>
              <p className="text-slate-300 text-base">
                Το σκορ σας: <span className="text-emerald-400 font-bold">{score}</span> / {activeQuestions.length} ({Math.round((score / activeQuestions.length) * 100)}%)
              </p>
              <button
                onClick={() => {
                  setCurrentIdx(0);
                  setScore(0);
                  setSelectedAnswer(null);
                  setIsAnswered(false);
                  setIsExamCompleted(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold px-5 py-2.5 rounded-xl border border-slate-700 transition flex items-center gap-2 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Επανάληψη
              </button>
            </div>
          ) : (
            /* Κύρια Κάρτα Ερώτησης */
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col gap-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  Ερώτηση {currentIdx + 1} από {activeQuestions.length}
                </span>
                {mode === 'mock' && (
                  <span className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-md">
                    <Clock className="w-4 h-4" /> {formatTimer(timeLeft)}
                  </span>
                )}
              </div>

              <h3 className="text-lg md:text-xl font-semibold leading-relaxed">
                {activeQuestions[currentIdx]?.text}
              </h3>

              {/* Επιλογές Απαντήσεων */}
              <div className="grid grid-cols-1 gap-2.5">
                {activeQuestions[currentIdx]?.options.map((opt, idx) => {
                  let btnStyle = 'border-slate-800 bg-slate-950/60 hover:border-slate-700';
                  if (isAnswered) {
                    if (idx === activeQuestions[currentIdx].correct) {
                      btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 font-medium';
                    } else if (idx === selectedAnswer) {
                      btnStyle = 'border-rose-500 bg-rose-500/10 text-rose-300';
                    }
                  }
                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleSelectAnswer(idx)}
                      className={`w-full p-4 rounded-xl border text-left text-sm md:text-base flex items-center justify-between transition ${btnStyle}`}
                    >
                      <span>{opt}</span>
                      {isAnswered && idx === activeQuestions[currentIdx].correct && (
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && idx === selectedAnswer && idx !== activeQuestions[currentIdx].correct && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {isAnswered && (
                <div className="flex justify-end pt-3 border-t border-slate-800">
                  <button
                    onClick={handleNext}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-xl transition flex items-center gap-1.5 text-sm"
                  >
                    Επόμενη Ερώτηση <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="w-full bg-slate-900 border border-dashed border-slate-800 rounded-xl py-3 text-center text-xs text-slate-500">
            Διαφήμιση Google AdSense (Bottom Leaderboard)
          </div>
        </main>
      </div>

      {/* Modal Σύνδεσης & Εγγραφής */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold text-slate-100 mb-1">
              {authMode === 'login' ? 'Σύνδεση στο λογαριασμό σας' : 'Δημιουργία Δωρεάν Λογαριασμού'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              {authMode === 'login' 
                ? 'Συνδεθείτε με το Email ή το Username σας.' 
                : 'Κάντε εγγραφή για 20 ερωτήσεις καθημερινά και αποθήκευση στατιστικών.'}
            </p>

            {authError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3.5">
              {authMode === 'login' ? (
                <div>
                  <label className="text-xs text-slate-300 font-medium mb-1 block">Email ή Username</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={authLoginIdentifier}
                      onChange={(e) => setAuthLoginIdentifier(e.target.value)}
                      placeholder="Email ή Username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">Username</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        placeholder="π.χ. GeorgeSecurity"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 font-medium mb-1 block">Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-slate-300 font-medium mb-1 block">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Τουλάχιστον 6 χαρακτήρες"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold py-2.5 rounded-xl transition text-sm"
              >
                {authLoading 
                  ? 'Παρακαλώ περιμένετε...' 
                  : authMode === 'login' ? 'Σύνδεση' : 'Δημιουργία Λογαριασμού'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError(null);
                }}
                className="text-xs text-slate-400 hover:text-emerald-400 transition"
              >
                {authMode === 'login' 
                  ? 'Δεν έχετε λογαριασμό; Κάντε εγγραφή' 
                  : 'Έχετε ήδη λογαριασμό; Συνδεθείτε'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}