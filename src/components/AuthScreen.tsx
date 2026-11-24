import React, { useEffect, useState } from 'react';
import {
  Globe,
  Sun,
  Moon,
  Store as StoreIcon,
  Loader2,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  User as UserIcon,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useT } from '../i18n';
import { PWAInstallButton } from './PWAInstallButton';
import { checkWorkspaceBootstrapStatus } from '../data/firebaseSync';
import { isValidUsername, normalizeUsername } from '../firebase';

export const AuthScreen: React.FC<{ onOpenCatalog?: () => void }> = ({ onOpenCatalog }) => {
  const loginWithUsername = useAppStore((s) => s.loginWithUsername);
  const bootstrapFirstRun = useAppStore((s) => s.bootstrapFirstRun);
  const cloudError = useAppStore((s) => s.cloudError);
  const clearCloudError = useAppStore((s) => s.clearCloudError);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const t = useT();

  const [checkingBootstrap, setCheckingBootstrap] = useState(true);
  const [alreadyBootstrapped, setAlreadyBootstrapped] = useState(true);
  const [setupMode, setSetupMode] = useState(false);

  // Standard login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // First-run secure bootstrap state (passwords are never hardcoded — entered by user)
  const [ownerName, setOwnerName] = useState('ISLOMBEK');
  const [ownerUsername, setOwnerUsername] = useState('islombek');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPasswordConfirm, setOwnerPasswordConfirm] = useState('');
  const [showOwnerPw, setShowOwnerPw] = useState(false);

  const [createFirstEmp, setCreateFirstEmp] = useState(true);
  const [empName, setEmpName] = useState('TEMUR');
  const [empUsername, setEmpUsername] = useState('temurr');
  const [empPassword, setEmpPassword] = useState('');
  const [showEmpPw, setShowEmpPw] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void checkWorkspaceBootstrapStatus()
      .then((res) => {
        if (!active) return;
        setAlreadyBootstrapped(res.bootstrapped);
        setSetupMode(!res.bootstrapped && !res.offline);
      })
      .finally(() => {
        if (active) setCheckingBootstrap(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    clearCloudError();

    const cleanUser = normalizeUsername(username);
    if (!cleanUser || !isValidUsername(cleanUser)) {
      setError(
        language === 'ru'
          ? 'Введите корректный логин (минимум 3 символа).'
          : "Login kamida 3 ta lotin harf yoki raqamdan iborat bo'lishi kerak."
      );
      return;
    }
    if (!password) {
      setError(language === 'ru' ? 'Введите пароль.' : 'Parolni kiriting.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await loginWithUsername(cleanUser, password);
      if (!res.ok) {
        setError(res.error || useAppStore.getState().cloudError || t.auth.invalidCredentials);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    clearCloudError();

    const cleanOwnerU = normalizeUsername(ownerUsername);
    if (!ownerName.trim()) {
      setError("Do'kon egasi ismini kiriting.");
      return;
    }
    if (!isValidUsername(cleanOwnerU)) {
      setError("Egasi logini kamida 3 ta lotin harf/raqamdan iborat bo'lishi kerak (masalan: islombek).");
      return;
    }
    if (ownerPassword.length < 6) {
      setError("Egasi paroli kamida 6 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (ownerPassword !== ownerPasswordConfirm) {
      setError('Egasi parollari bir-biriga mos emas.');
      return;
    }

    if (createFirstEmp) {
      const cleanEmpU = normalizeUsername(empUsername);
      if (!empName.trim()) {
        setError('Birinchi xodim ismini kiriting.');
        return;
      }
      if (!isValidUsername(cleanEmpU)) {
        setError("Xodim logini kamida 3 ta lotin harf/raqamdan iborat bo'lishi kerak (masalan: temurr).");
        return;
      }
      if (cleanEmpU === cleanOwnerU) {
        setError("Egasi va xodim loginlari har xil bo'lishi kerak.");
        return;
      }
      if (empPassword.length < 6) {
        setError("Xodim paroli kamida 6 ta belgidan iborat bo'lishi kerak.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await bootstrapFirstRun({
        ownerName: ownerName.trim(),
        ownerUsername: cleanOwnerU,
        ownerPassword,
        addEmployee: createFirstEmp,
        empName: empName.trim(),
        empUsername: normalizeUsername(empUsername),
        empPassword,
      });
      if (!res.ok) {
        setError(res.error || useAppStore.getState().cloudError || "Boshlang'ich sozlashda xatolik");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-4 md:p-8">
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <img
            src="/assets/aistudio/IMG_20261007_140535_653_64e97dff_64e97dff.jpg"
            alt="SHU BREND OMBOR"
            className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-xs"
          />
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            SHU BREND OMBOR
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenCatalog && (
            <button
              type="button"
              onClick={onOpenCatalog}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
            >
              <StoreIcon className="w-3.5 h-3.5" />
              <span>{t.nav.storefront}</span>
            </button>
          )}
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => setLanguage(language === 'uz' ? 'ru' : 'uz')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{language.toUpperCase()}</span>
          </button>
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Theme"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto my-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <img
              src="/assets/aistudio/IMG_20261007_140535_653_64e97dff_64e97dff.jpg"
              alt="SHU BREND OMBOR"
              className="w-16 h-16 rounded-full mx-auto object-cover border border-slate-200 dark:border-slate-800 shadow-xs"
            />
            <p className="text-xs font-medium text-teal-700 dark:text-teal-400 pt-1">
              {language === 'uz' ? 'Chakana savdo va ombor platformasi' : 'Платформа розничной торговли и склада'}
            </p>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {setupMode
                ? language === 'uz'
                  ? "Boshlang'ich sozlash"
                  : 'Первоначальная настройка'
                : t.auth.loginTitle}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {setupMode
                ? "Do'kon egasi va birinchi xodim uchun login va parol o'rnating (faqat bir marta)."
                : t.auth.loginSubtitle}
            </p>
          </div>

          {checkingBootstrap ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin text-teal-700" />
              <span>Tizim holati tekshirilmoqda...</span>
            </div>
          ) : setupMode && !alreadyBootstrapped ? (
            <form onSubmit={handleBootstrapSubmit} className="space-y-4">
              {(error || (cloudError && cloudError !== error)) && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2.5">
                  {error || cloudError}
                </p>
              )}

              <div className="rounded-xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>1. Do'kon Egasi (Owner / Admin)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Ism
                    </label>
                    <input
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                      Login
                    </label>
                    <input
                      value={ownerUsername}
                      onChange={(e) => setOwnerUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                      placeholder="islombek"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Parol (kamida 6 belgi) *
                  </label>
                  <div className="relative">
                    <input
                      type={showOwnerPw ? 'text' : 'password'}
                      value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full h-9 pl-3 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOwnerPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showOwnerPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                    Parolni tasdiqlang *
                  </label>
                  <input
                    type={showOwnerPw ? 'text' : 'password'}
                    value={ownerPasswordConfirm}
                    onChange={(e) => setOwnerPasswordConfirm(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-3.5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createFirstEmp}
                    onChange={(e) => setCreateFirstEmp(e.target.checked)}
                    className="accent-teal-700"
                  />
                  <UserPlus className="w-4 h-4 text-teal-700" />
                  <span>2. Birinchi xodimni ham yaratish (Kassir)</span>
                </label>

                {createFirstEmp && (
                  <div className="space-y-2.5 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Xodim ismi
                        </label>
                        <input
                          value={empName}
                          onChange={(e) => setEmpName(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Login
                        </label>
                        <input
                          value={empUsername}
                          onChange={(e) => setEmpUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                          autoCapitalize="none"
                          autoCorrect="off"
                          placeholder="temurr"
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Xodim paroli (kamida 6 belgi) *
                      </label>
                      <div className="relative">
                        <input
                          type={showEmpPw ? 'text' : 'password'}
                          value={empPassword}
                          onChange={(e) => setEmpPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-9 pl-3 pr-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowEmpPw((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showEmpPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sozlanmoqda...</span>
                  </>
                ) : (
                  <span>Tizimni ishga tushirish</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSetupMode(false);
                }}
                className="w-full text-center text-xs text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 py-1"
              >
                Allaqachon akkauntingiz bormi? Login bilan kirish
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {(error || (cloudError && cloudError !== error)) && (
                <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2.5">
                  {error || cloudError}
                </p>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t.auth.username}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    autoFocus
                    placeholder="islombek"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t.auth.password}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.auth.signingIn}</span>
                  </>
                ) : (
                  <span>{t.auth.signIn}</span>
                )}
              </button>

              {!alreadyBootstrapped && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSetupMode(true);
                  }}
                  className="w-full text-center text-xs font-medium text-teal-700 dark:text-teal-400 hover:underline py-1"
                >
                  Yangi tizimmi? Boshlang'ich sozlashni boshlash
                </button>
              )}

              <div className="flex items-start gap-2 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200/80 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <span>{t.auth.cloudSyncHint}</span>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 dark:text-slate-600">
        SHU BREND OMBOR · {language === 'uz' ? "O'zbekiston chakana savdo tizimi" : 'Система розничной торговли'}
      </div>
    </div>
  );
};
