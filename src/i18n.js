/**
 * Internationalization (i18n) module — TR/EN support
 * All UI strings go through t('key') for multilingual rendering.
 */

const STORAGE_KEY = 'yga_language';

const translations = {
  tr: {
    // App
    appName: 'Tehlike İhbar',
    appVersion: 'Tehlike İhbar v1.0.0',
    builtFor: 'Built for YGA',

    // Nav
    navReports: 'İhbarlar',
    navFame: 'Onur Listesi',
    navLeaderboard: 'Sıralama',

    // Home
    noReports: 'Henüz ihbar yok',
    noReportsHint: 'Çevrenizdeki tehlikeleri bildirmek için\naşağıdaki butona tıklayın.',
    recentReports: 'Son İhbarlar',
    openCount: 'açık',
    reportBtn: 'İhbar Et',

    // Create
    newReport: 'Yeni İhbar',
    hazardType: 'Tehlike Türü',
    photo: 'Fotoğraf',
    photoHint: 'Fotoğraf seçmek için tıklayın',
    description: 'Açıklama',
    descPlaceholder: 'Tehlike hakkında detaylı bilgi verin...\nÖrn: Kütüphane 2. katta kırık cam var, dikkat!',
    location: 'Konum',
    fetchingLocation: 'Konum alınıyor...',
    submitReport: 'İhbarı Gönder',
    selectCategory: 'Lütfen bir tehlike türü seçin.',
    addPhoto: 'Lütfen bir fotoğraf ekleyin.',
    addDescription: 'Lütfen bir açıklama yazın.',
    locationFailed: 'Konum bilgisi alınamadı. Tekrar deneyin.',
    reportSuccess: 'İhbar başarıyla gönderildi! +10 puan 🎉',
    reportFailed: 'Gönderim başarısız: ',
    photoFailed: 'Fotoğraf yüklenemedi.',
    retry: 'Tekrar Dene',
    refreshLocation: 'Konumu Yenile',

    // Nearby / Duplicate Detection
    nearbyTitle: 'Yakında Benzer İhbar Var Mı?',
    nearbyHint: 'Konumunuza yakın ihbarlar — aynı sorun ise oy verin:',
    nearbyNone: 'Yakında ihbar bulunamadı.',
    metersAway: 'm uzakta',

    // Admin
    adminPanel: 'Yönetim Paneli',
    statusOpen: 'Açık',
    statusReview: 'İnceleniyor',
    statusResolved: 'Çözüldü',
    filterAll: 'Tümü',
    noFilteredReports: 'durumunda ihbar yok',
    updateStatus: 'Durumu Güncelle',
    deleteReport: 'İhbarı Sil',
    deleteConfirmTitle: 'İhbarı Sil',
    deleteConfirmMsg: 'Bu ihbarı silmek istediğinize emin misiniz?',
    reportDeleted: 'İhbar silindi.',
    statusUpdated: 'Durum güncellendi.',
    assignTo: 'Tamirciye Ata',
    assignSuccess: 'İhbar atandı.',
    unassigned: 'Atanmamış',

    // Roles
    manageUsers: 'Kullanıcı Yönetimi',
    roleAdmin: 'Yönetici',
    roleRepairman: 'Tamirci',
    roleUser: 'Kullanıcı',
    setRole: 'Rol Ata',
    roleUpdated: 'Rol güncellendi.',

    // Repairman
    myAssignments: 'Atanan İhbarlarım',
    noAssignments: 'Henüz atanmış ihbar yok',
    noAssignmentsHint: 'Yönetici size ihbar atadığında burada görünecek.',

    // Fame
    hallOfFame: 'Onur Listesi',
    noResolved: 'Henüz çözülen ihbar yok',
    noResolvedHint: 'Çözüme kavuşan ihbarlar burada görünecek.\nBu sistem güveni artırır!',
    resolvedHazards: 'Çözülen Tehlikeler 🏆',
    resolved: 'çözüldü',
    resolvedBadge: 'Çözüldü ✓',
    votes: 'oy',

    // Leaderboard
    leaderboard: 'Sıralama',
    yourPoints: 'Güvenlik Puanın',
    loginToSee: 'Puanını görmek için giriş yap',
    pointRules: 'Puan Kuralları',
    ruleReport: 'İhbar gönder',
    ruleUpvote: 'Her oy al',
    ruleResolve: 'İhbar çözülsün',
    noLeaderboard: 'Henüz sıralama yok',
    noLeaderboardHint: 'Giriş yapıp ihbar göndererek\nsıralamaya katılabilirsiniz.',
    safetyHeroes: 'Güvenlik Kahramanları',
    allBadges: 'Tüm Rozetler',
    points: 'puan',

    // Auth
    loginSuccess: 'Giriş başarılı!',
    loginCancelled: 'Giriş iptal edildi.',
    loginFailed: 'Giriş yapılamadı: ',
    logoutSuccess: 'Çıkış yapıldı.',
    login: 'Giriş Yap',
    logout: 'Çıkış Yap',

    // Upvote
    voted: 'Oy verildi! 👍',
    voteFailed: 'Oy verilemedi.',

    // PWA
    installApp: 'Uygulamayı Yükle',
    installHint: 'Ana ekranına ekle',

    // Notifications
    notifications: 'Bildirimler',
    noNotifications: 'Bildirim yok',
    notifStatusChanged: 'ihbarınızın durumu değişti:',
    notifAssigned: 'Size yeni bir ihbar atandı.',
    markAllRead: 'Tümünü Okundu İşaretle',

    // Categories
    cat_elektrik: 'Bozuk Priz / Elektrik',
    cat_cam: 'Kırık Cam',
    cat_zemin: 'Kaygan Zemin',
    cat_aydinlatma: 'Aydınlatma Sorunu',
    cat_yapi: 'Yapısal Hasar',
    cat_yangin: 'Yangın Riski',
    cat_su: 'Su Sızıntısı',
    cat_erisilebilirlik: 'Erişilebilirlik Engeli',
    cat_diger: 'Diğer',
  },

  en: {
    // App
    appName: 'Hazard Report',
    appVersion: 'Hazard Report v1.0.0',
    builtFor: 'Built for YGA',

    // Nav
    navReports: 'Reports',
    navFame: 'Hall of Fame',
    navLeaderboard: 'Leaderboard',

    // Home
    noReports: 'No reports yet',
    noReportsHint: 'Click the button below to\nreport hazards around you.',
    recentReports: 'Recent Reports',
    openCount: 'open',
    reportBtn: 'Report',

    // Create
    newReport: 'New Report',
    hazardType: 'Hazard Type',
    photo: 'Photo',
    photoHint: 'Click to select a photo',
    description: 'Description',
    descPlaceholder: 'Provide details about the hazard...\nEx: Broken glass on 2nd floor of the library, be careful!',
    location: 'Location',
    fetchingLocation: 'Fetching location...',
    submitReport: 'Submit Report',
    selectCategory: 'Please select a hazard type.',
    addPhoto: 'Please add a photo.',
    addDescription: 'Please add a description.',
    locationFailed: 'Could not get location. Try again.',
    reportSuccess: 'Report submitted! +10 points 🎉',
    reportFailed: 'Submission failed: ',
    photoFailed: 'Could not load photo.',
    retry: 'Retry',
    refreshLocation: 'Refresh Location',

    // Nearby
    nearbyTitle: 'Similar Reports Nearby?',
    nearbyHint: 'Reports near your location — upvote if it\'s the same issue:',
    nearbyNone: 'No reports found nearby.',
    metersAway: 'm away',

    // Admin
    adminPanel: 'Admin Panel',
    statusOpen: 'Open',
    statusReview: 'Under Review',
    statusResolved: 'Resolved',
    filterAll: 'All',
    noFilteredReports: 'status have no reports',
    updateStatus: 'Update Status',
    deleteReport: 'Delete Report',
    deleteConfirmTitle: 'Delete Report',
    deleteConfirmMsg: 'Are you sure you want to delete this report?',
    reportDeleted: 'Report deleted.',
    statusUpdated: 'Status updated.',
    assignTo: 'Assign to Repairman',
    assignSuccess: 'Report assigned.',
    unassigned: 'Unassigned',

    // Roles
    manageUsers: 'User Management',
    roleAdmin: 'Admin',
    roleRepairman: 'Repairman',
    roleUser: 'User',
    setRole: 'Set Role',
    roleUpdated: 'Role updated.',

    // Repairman
    myAssignments: 'My Assignments',
    noAssignments: 'No assignments yet',
    noAssignmentsHint: 'Reports assigned to you will appear here.',

    // Fame
    hallOfFame: 'Hall of Fame',
    noResolved: 'No resolved reports yet',
    noResolvedHint: 'Resolved reports will appear here.\nThis builds trust in the system!',
    resolvedHazards: 'Resolved Hazards 🏆',
    resolved: 'resolved',
    resolvedBadge: 'Resolved ✓',
    votes: 'votes',

    // Leaderboard
    leaderboard: 'Leaderboard',
    yourPoints: 'Your Safety Points',
    loginToSee: 'Log in to see your points',
    pointRules: 'Point Rules',
    ruleReport: 'Submit a report',
    ruleUpvote: 'Receive an upvote',
    ruleResolve: 'Report gets resolved',
    noLeaderboard: 'No rankings yet',
    noLeaderboardHint: 'Log in and submit reports\nto join the leaderboard.',
    safetyHeroes: 'Safety Heroes',
    allBadges: 'All Badges',
    points: 'pts',

    // Auth
    loginSuccess: 'Login successful!',
    loginCancelled: 'Login cancelled.',
    loginFailed: 'Login failed: ',
    logoutSuccess: 'Logged out.',
    login: 'Log In',
    logout: 'Log Out',

    // Upvote
    voted: 'Upvoted! 👍',
    voteFailed: 'Could not upvote.',

    // PWA
    installApp: 'Install App',
    installHint: 'Add to home screen',

    // Notifications
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    notifStatusChanged: 'your report status changed:',
    notifAssigned: 'A new report was assigned to you.',
    markAllRead: 'Mark All Read',

    // Categories
    cat_elektrik: 'Broken Outlet / Electrical',
    cat_cam: 'Broken Glass',
    cat_zemin: 'Slippery Floor',
    cat_aydinlatma: 'Lighting Issue',
    cat_yapi: 'Structural Damage',
    cat_yangin: 'Fire Hazard',
    cat_su: 'Water Leak',
    cat_erisilebilirlik: 'Accessibility Barrier',
    cat_diger: 'Other',
  },
};

let currentLanguage = localStorage.getItem(STORAGE_KEY) || 'tr';

/**
 * Get a translated string by key.
 * @param {string} key
 * @returns {string}
 */
export function t(key) {
  return translations[currentLanguage]?.[key] || translations.tr[key] || key;
}

/**
 * Get the current language.
 * @returns {'tr'|'en'}
 */
export function getLanguage() {
  return currentLanguage;
}

/**
 * Set the language and persist.
 * @param {'tr'|'en'} lang
 */
export function setLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem(STORAGE_KEY, lang);
}

/**
 * Toggle between TR and EN.
 * @returns {string} the new language
 */
export function toggleLanguage() {
  const newLang = currentLanguage === 'tr' ? 'en' : 'tr';
  setLanguage(newLang);
  return newLang;
}

/**
 * Get translated category label.
 */
export function tCat(categoryId) {
  return t('cat_' + categoryId);
}

/**
 * Get translated status label.
 */
export function tStatus(status) {
  if (status === 'Açık') return t('statusOpen');
  if (status === 'İnceleniyor') return t('statusReview');
  if (status === 'Çözüldü') return t('statusResolved');
  return status;
}
