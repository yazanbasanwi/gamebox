// src/context/LanguageContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
}

const translations = {
  en: {
    // Navbar
    home: "Home",
    games: "Games",
    reviews: "Reviews",
    community: "Community",
    library: "Library",
    lists: "Lists",
    journal: "Journal",
    admin: "Admin",
    searchGames: "Search games...",
    logIn: "Log In",
    signUp: "Sign Up",
    logOut: "Log Out",
    profile: "Profile",
    myLibrary: "My Library",
    myLists: "My Lists",

    // Home
    welcomeTo: "Welcome to",
    homeSubtitle: "Track the games you play, write reviews, and explore personalized recommendations.",
    getStarted: "Get Started",
    browseGames: "Browse Games",
    viewReviews: "View Reviews",
    flexibleReviews: "Flexible Reviews",
    flexibleReviewsDesc: "Write simple star ratings or detailed category-based reviews.",
    aiRecommendations: "AI Recommendations",
    aiRecommendationsDesc: "Get personalized game suggestions based on your taste.",
    yourGameLibrary: "Your Game Library",
    yourGameLibraryDesc: "Keep track of games you played, are playing, or want to play.",

    // Auth
    welcomeBack: "Welcome Back",
    loginSubtitle: "Log in to continue your gaming journey",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    enterEmail: "Enter your email",
    enterPassword: "Enter your password",
    forgotPassword: "Forgot password?",
    orContinueWith: "or continue with",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    joinGameBox: "Join GameBox",
    createAccountSubtitle: "Create your account and start reviewing",
    username: "Username",
    chooseUsername: "Choose a username",
    createAccount: "Create Account",
    creatingAccount: "Creating Account...",
    loggingIn: "Logging in...",
    resetPassword: "Reset Password",
    resetSubtitle: "Enter your email and we'll send you a reset link",
    sendResetLink: "Send Reset Link",
    checkEmail: "Check Your Email",
    backToLogin: "Back to Login",

    // Browse
    browseTitle: "Browse Games",
    searchForGame: "Search for a game...",
    search: "Search",
    popular: "Popular",
    newReleases: "New Releases",
    topRated: "Top Rated",
    loadingGames: "Loading games...",
    noGamesFound: "No games found. Try a different search.",

    // Game Detail
    about: "About",
    screenshots: "Screenshots",
    details: "Details",
    platforms: "Platforms",
    gameModes: "Game Modes",
    themes: "Themes",
    igdbRating: "IGDB Rating",
    similarGames: "Similar Games",
    currentlyPlaying: "Currently Playing",
    wantToPlay: "Want to Play",
    completed: "Completed",
    writeReview: "Write a Review",
    simpleReview: "Simple Review",
    detailedReview: "Detailed Review",
    categoryRatings: "Category Ratings",
    gameplay: "Gameplay",
    graphics: "Graphics",
    audioSoundtrack: "Audio / Soundtrack",
    storyNarrative: "Story / Narrative",
    replayability: "Replayability",
    overallScore: "Overall Score",
    overallRating: "Overall Rating",
    yourReview: "Your Review (Optional)",
    shareThoughts: "Share your thoughts about this game...",
    publishReview: "Publish Review",
    publishing: "Publishing...",
    cancel: "Cancel",
    voiceInput: "🎤 Voice Input",
    stopRecording: "🛑 Stop Recording",
    listen: "🔊 Listen",
    stop: "🔇 Stop",
    report: "🚩 Report",
    showComments: "Show Comments",
    hideComments: "Hide Comments",
    noReviewsYet: "No reviews yet. Be the first to review!",
    noCommentsYet: "No comments yet",
    writeComment: "Write a comment...",
    post: "Post",
    votes: "votes",

    // Feed
    communityReviews: "Community Reviews",
    aiRecsTitle: "🤖 AI Recommendations",
    aiRecsSubtitle: "Based on your library and preferences",
    analyzingTaste: "Analyzing your taste...",
    addGamesForRecs: "Add games to your library for recommendations",
    reviewed: "reviewed",

    // Library
    myLibraryTitle: "My Library",
    manageCollection: "Manage your gaming collection",
    playing: "Playing",
    noGamesInCategory: "No games in this category yet.",
    remove: "Remove",

    // Profile
    noBioYet: "No bio yet",
    editProfile: "Edit Profile",
    follow: "Follow",
    unfollow: "Unfollow",
    followers: "Followers",
    following: "Following",
    save: "Save",
    displayName: "Display name",
    aboutYourself: "Write something about yourself...",
    favoriteGenres: "Favorite genres (comma separated)",
    myReviews: "My Reviews",
    noReviewsWritten: "No reviews yet.",
    delete: "Delete",

    // Community
    communityTitle: "Community",
    discoverGamers: "Discover and follow other gamers",
    searchUsers: "Search users...",
    noUsersFound: "No users found",

    // Lists
    gameListsTitle: "Game Lists",
    createList: "Create List",
    myListsTab: "My Lists",
    communityLists: "Community Lists",
    createNewList: "Create a New List",
    listTitle: "Title",
    listTitlePlaceholder: "e.g. Top Horror Games 2025",
    listDescription: "Description (Optional)",
    listDescPlaceholder: "What is this list about?",
    create: "Create",
    noListsYet: "You haven't created any lists yet.",
    noCommunityLists: "No community lists yet.",
    view: "View",

    // Journal
    gameJournalTitle: "Game Journal",
    documentExperiences: "Document your gaming experiences and thoughts",
    newEntry: "New Entry",
    newJournalEntry: "New Journal Entry",
    entryTitle: "Title",
    entryTitlePlaceholder: "Today's gaming session...",
    gameOptional: "Game (Optional)",
    whatGame: "What game are you writing about?",
    mood: "Mood",
    entry: "Entry",
    writeExperience: "Write about your experience...",
    saveEntry: "Save Entry",
    noEntriesYet: "No journal entries yet. Start documenting your gaming journey!",
    great: "great",
    good: "good",
    neutral: "neutral",
    bad: "bad",
    terrible: "terrible",

    // Admin
    adminDashboard: "Admin Dashboard",
    totalUsers: "Total Users",
    totalReviews: "Total Reviews",
    pendingReports: "Pending Reports",
    bannedUsers: "Banned Users",
    overview: "Overview",
    users: "Users",
    reports: "Reports",
    userManagement: "User Management",
    reviewManagement: "Review Management",
    actions: "Actions",
    role: "Role",
    ban: "Ban",
    unban: "Unban",
    resolve: "Resolve",
    dismiss: "Dismiss",
    recentActivity: "Recent Activity",
    reason: "Reason",
    status: "Status",
    type: "Type",

    // General
    loading: "Loading...",
    pageNotFound: "404 — Page Not Found",
  },

  ar: {
    // Navbar
    home: "الرئيسية",
    games: "الألعاب",
    reviews: "المراجعات",
    community: "المجتمع",
    library: "المكتبة",
    lists: "القوائم",
    journal: "اليوميات",
    admin: "لوحة التحكم",
    searchGames: "ابحث عن لعبة...",
    logIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    logOut: "تسجيل الخروج",
    profile: "الملف الشخصي",
    myLibrary: "مكتبتي",
    myLists: "قوائمي",

    // Home
    welcomeTo: "مرحباً في",
    homeSubtitle: "تابع الألعاب التي تلعبها، اكتب مراجعات، واستكشف توصيات مخصصة.",
    getStarted: "ابدأ الآن",
    browseGames: "تصفح الألعاب",
    viewReviews: "عرض المراجعات",
    flexibleReviews: "مراجعات مرنة",
    flexibleReviewsDesc: "اكتب تقييمات بسيطة بالنجوم أو مراجعات تفصيلية حسب الفئات.",
    aiRecommendations: "توصيات ذكية",
    aiRecommendationsDesc: "احصل على اقتراحات ألعاب مخصصة بناءً على ذوقك.",
    yourGameLibrary: "مكتبة ألعابك",
    yourGameLibraryDesc: "تتبع الألعاب التي لعبتها أو تلعبها أو تريد لعبها.",

    // Auth
    welcomeBack: "مرحباً بعودتك",
    loginSubtitle: "سجل دخولك لمتابعة رحلتك في عالم الألعاب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    confirmPassword: "تأكيد كلمة المرور",
    enterEmail: "أدخل بريدك الإلكتروني",
    enterPassword: "أدخل كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    orContinueWith: "أو تابع باستخدام",
    noAccount: "ليس لديك حساب؟",
    hasAccount: "لديك حساب بالفعل؟",
    joinGameBox: "انضم إلى GameBox",
    createAccountSubtitle: "أنشئ حسابك وابدأ بكتابة المراجعات",
    username: "اسم المستخدم",
    chooseUsername: "اختر اسم مستخدم",
    createAccount: "إنشاء حساب",
    creatingAccount: "جاري الإنشاء...",
    loggingIn: "جاري تسجيل الدخول...",
    resetPassword: "إعادة تعيين كلمة المرور",
    resetSubtitle: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين",
    sendResetLink: "إرسال رابط إعادة التعيين",
    checkEmail: "تحقق من بريدك الإلكتروني",
    backToLogin: "العودة لتسجيل الدخول",

    // Browse
    browseTitle: "تصفح الألعاب",
    searchForGame: "ابحث عن لعبة...",
    search: "بحث",
    popular: "الأكثر شعبية",
    newReleases: "إصدارات جديدة",
    topRated: "الأعلى تقييماً",
    loadingGames: "جاري تحميل الألعاب...",
    noGamesFound: "لم يتم العثور على ألعاب. جرب بحثاً مختلفاً.",

    // Game Detail
    about: "حول اللعبة",
    screenshots: "لقطات الشاشة",
    details: "التفاصيل",
    platforms: "المنصات",
    gameModes: "أوضاع اللعب",
    themes: "الموضوعات",
    igdbRating: "تقييم IGDB",
    similarGames: "ألعاب مشابهة",
    currentlyPlaying: "ألعبها حالياً",
    wantToPlay: "أريد لعبها",
    completed: "أنهيتها",
    writeReview: "اكتب مراجعة",
    simpleReview: "مراجعة بسيطة",
    detailedReview: "مراجعة تفصيلية",
    categoryRatings: "التقييم حسب الفئة",
    gameplay: "أسلوب اللعب",
    graphics: "الرسومات",
    audioSoundtrack: "الصوت / الموسيقى",
    storyNarrative: "القصة / السرد",
    replayability: "قابلية إعادة اللعب",
    overallScore: "التقييم العام",
    overallRating: "التقييم الإجمالي",
    yourReview: "مراجعتك (اختياري)",
    shareThoughts: "شارك أفكارك حول هذه اللعبة...",
    publishReview: "نشر المراجعة",
    publishing: "جاري النشر...",
    cancel: "إلغاء",
    voiceInput: "🎤 إدخال صوتي",
    stopRecording: "🛑 إيقاف التسجيل",
    listen: "🔊 استمع",
    stop: "🔇 إيقاف",
    report: "🚩 إبلاغ",
    showComments: "عرض التعليقات",
    hideComments: "إخفاء التعليقات",
    noReviewsYet: "لا توجد مراجعات بعد. كن أول من يراجع!",
    noCommentsYet: "لا توجد تعليقات بعد",
    writeComment: "اكتب تعليقاً...",
    post: "نشر",
    votes: "صوت",

    // Feed
    communityReviews: "مراجعات المجتمع",
    aiRecsTitle: "🤖 توصيات ذكية",
    aiRecsSubtitle: "بناءً على مكتبتك وتفضيلاتك",
    analyzingTaste: "جاري تحليل ذوقك...",
    addGamesForRecs: "أضف ألعاباً لمكتبتك للحصول على توصيات",
    reviewed: "راجع",

    // Library
    myLibraryTitle: "مكتبتي",
    manageCollection: "إدارة مجموعة ألعابك",
    playing: "ألعبها الآن",
    noGamesInCategory: "لا توجد ألعاب في هذه الفئة بعد.",
    remove: "إزالة",

    // Profile
    noBioYet: "لا يوجد وصف بعد",
    editProfile: "تعديل الملف الشخصي",
    follow: "متابعة",
    unfollow: "إلغاء المتابعة",
    followers: "المتابعون",
    following: "المتابَعون",
    save: "حفظ",
    displayName: "الاسم المعروض",
    aboutYourself: "اكتب شيئاً عن نفسك...",
    favoriteGenres: "الأنواع المفضلة (مفصولة بفواصل)",
    myReviews: "مراجعاتي",
    noReviewsWritten: "لم تكتب أي مراجعات بعد.",
    delete: "حذف",

    // Community
    communityTitle: "المجتمع",
    discoverGamers: "اكتشف وتابع لاعبين آخرين",
    searchUsers: "ابحث عن مستخدمين...",
    noUsersFound: "لم يتم العثور على مستخدمين",

    // Lists
    gameListsTitle: "قوائم الألعاب",
    createList: "إنشاء قائمة",
    myListsTab: "قوائمي",
    communityLists: "قوائم المجتمع",
    createNewList: "إنشاء قائمة جديدة",
    listTitle: "العنوان",
    listTitlePlaceholder: "مثال: أفضل ألعاب الرعب 2025",
    listDescription: "الوصف (اختياري)",
    listDescPlaceholder: "عن ماذا تتحدث هذه القائمة؟",
    create: "إنشاء",
    noListsYet: "لم تنشئ أي قوائم بعد.",
    noCommunityLists: "لا توجد قوائم مجتمعية بعد.",
    view: "عرض",

    // Journal
    gameJournalTitle: "يوميات الألعاب",
    documentExperiences: "وثق تجاربك وأفكارك في عالم الألعاب",
    newEntry: "إدخال جديد",
    newJournalEntry: "إدخال يوميات جديد",
    entryTitle: "العنوان",
    entryTitlePlaceholder: "جلسة اليوم...",
    gameOptional: "اللعبة (اختياري)",
    whatGame: "عن أي لعبة تكتب؟",
    mood: "المزاج",
    entry: "المحتوى",
    writeExperience: "اكتب عن تجربتك...",
    saveEntry: "حفظ الإدخال",
    noEntriesYet: "لا توجد إدخالات بعد. ابدأ بتوثيق رحلتك!",
    great: "ممتاز",
    good: "جيد",
    neutral: "عادي",
    bad: "سيء",
    terrible: "سيء جداً",

    // Admin
    adminDashboard: "لوحة التحكم",
    totalUsers: "إجمالي المستخدمين",
    totalReviews: "إجمالي المراجعات",
    pendingReports: "بلاغات معلقة",
    bannedUsers: "مستخدمون محظورون",
    overview: "نظرة عامة",
    users: "المستخدمون",
    reports: "البلاغات",
    userManagement: "إدارة المستخدمين",
    reviewManagement: "إدارة المراجعات",
    actions: "الإجراءات",
    role: "الدور",
    ban: "حظر",
    unban: "إلغاء الحظر",
    resolve: "حل",
    dismiss: "رفض",
    recentActivity: "النشاط الأخير",
    reason: "السبب",
    status: "الحالة",
    type: "النوع",

    // General
    loading: "جاري التحميل...",
    pageNotFound: "404 — الصفحة غير موجودة",
  },
};

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem("gamebox-lang") || "en");

  useEffect(() => {
    localStorage.setItem("gamebox-lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  function t(key) {
    return translations[lang]?.[key] || translations.en[key] || key;
  }

  function toggleLanguage() {
    setLang((prev) => (prev === "en" ? "ar" : "en"));
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
