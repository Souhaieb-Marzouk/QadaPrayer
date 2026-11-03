/**
 * Long-form pages in three languages: the user guide and the privacy note.
 *
 * `tools/build-pages.mjs` renders them, so the three versions cannot drift.
 */

const APP = 'https://souhaieb-marzouk.github.io/QadaPrayer/app/';

export const PAGES = {
  en: {
    label: 'English',
    guideTitle: 'QadaPrayer — user guide',
    guideLead:
      'Everything the app does, in the order you will meet it. Ten minutes of reading, then it is one tap a prayer.',
    guideSections: [
      {
        t: '1. Install it',
        b: 'Android: open the releases page, download the .apk and install it (Android asks once to allow installs from this source). iPhone and iPad: open the app in Safari, tap Share → Add to Home Screen. Both work offline after the first load.',
      },
      {
        t: '2. The first screen asks one question',
        b: '“Do you already use QadaPrayer?” If another phone already holds your history, paste the sync code and everything arrives — skip to step 4. Otherwise tap Start fresh.',
      },
      {
        t: '3. Five short questions',
        b: 'Language, gender (for the exemption days), when your obligation began, whether you have been praying regularly since a date, and your city. Prayer times are computed on the phone; nothing is uploaded.',
      },
      {
        t: '4. Today',
        b: 'Five prayers, each with the make-ups that belong to it. Tap a prayer, tick “I prayed”, and confirm. The number on the ring goes down immediately.',
      },
      {
        t: '5. Correcting a mistake',
        b: 'Open the same prayer again: the sheet shows exactly what is recorded. Untick one make-up, or the prayer itself, then Save. The calendar updates with it.',
      },
      {
        t: '6. The calendar',
        b: 'A lifetime, month by month. Tap a day to see its five prayers, or use Mark a range to record whole months or years at once — useful for the years before you started.',
      },
      {
        t: '7. Progress and review',
        b: 'Progress shows what is left, your pace and the projected finish date. See the full review adds a streak, the last 28 days, the best and weakest day, and the last four weeks.',
      },
      {
        t: '8. Reminders',
        b: 'Settings → Reminders. Choose a lead time, quiet hours and a sound. Android shows an “I prayed” button on the notification; everywhere else, tapping it opens the confirmation.',
      },
      {
        t: '9. Backup and sync',
        b: 'Settings → Backup: export an encrypted file and keep it somewhere safe. On a second phone, either paste a sync code (Settings → Sync) or import the file — and choose Merge, so nothing is lost.',
      },
      {
        t: '10. Worth knowing',
        b: 'Appearance: dark, light, sepia, midnight, and Arabic digits. Qibla: a compass that turns with the phone. Widget: today at a glance. About: the app checks once a day for a new version and can install it.',
      },      {
        t: '11. Backups, in detail',
        b: 'Settings → Backup → Download writes an encrypted file to your Downloads folder (on iPhone it opens the share sheet). Keep it in your own cloud. To restore, choose the file and pick Merge — the union of what you had and what is in the file — or Replace. Merge never loses a mark; Replace is for starting over.',
      },
      {
        t: '12. More than one person',
        b: 'Settings → People. Each person has their own ledger, their own settings and their own sync code, so two people on one phone never share a count. Add a person, set them up once, then switch with a tap.',
      },
      {
        t: '13. The widget and updates',
        b: 'Long-press the home screen → Widgets → QadaPrayer for today at a glance. In Settings → About the app checks once a day for a new release and offers Download and install; Android asks you to confirm, and your data is kept.',
      },
      {
        t: '14. If something looks wrong',
        b: 'A mark you did not expect: open that day in the calendar and untick it — tomorrow always follows the ledger, never the other way round. The count does not move: check that the pace is not zero in Settings → Pace. Nothing loads: pull to refresh once; the app is offline-first, so the data is still there.',
      },
    ],
    privacyTitle: 'Privacy',
    privacyLead: 'Short version: your ledger never leaves your phone unless you send it.',
    privacyPoints: [
      'There is no account, no sign-up and no analytics. The app does not identify you.',
      'Everything you record is stored in your browser on your device, and works fully offline.',
      'The app talks to two places only: GitHub, to check for a new version, and — if you turn sync on — the small server you configured yourself. Both receive nothing but a request.',
      'Sync is end-to-end encrypted. The server stores a blob it cannot read, under a key derived from your code.',
      'Backups are files you create and keep. Encrypt them with a passphrase if you like.',
      'Clearing the app data, or uninstalling, deletes the ledger. Export a backup first — the app reminds you after a month without one.',
      'The Android build asks for network access, notifications, and permission to hand a downloaded update to the system installer. Nothing else.',
    ],
    privacyFoot: 'Questions about privacy: open an issue on GitHub.',
    appLabel: 'Open the app',
    back: 'Back to the website',
    guideLink: 'User guide',
    videosLink: 'Watch the six walkthrough parts',
  },

  fr: {
    label: 'Français',
    guideTitle: 'QadaPrayer — guide d’utilisation',
    guideLead:
      'Tout ce que fait l’application, dans l’ordre où vous le rencontrerez. Dix minutes de lecture, puis c’est un appui par prière.',
    guideSections: [
      {
        t: '1. Installer',
        b: 'Android : ouvrez la page des versions, téléchargez le .apk et installez-le (Android demande une fois d’autoriser l’installation depuis cette source). iPhone et iPad : ouvrez l’app dans Safari, touchez Partager → Sur l’écran d’accueil. Les deux fonctionnent hors ligne après le premier chargement.',
      },
      {
        t: '2. Le premier écran pose une question',
        b: '« Vous utilisez déjà QadaPrayer ? » Si un autre téléphone a déjà votre historique, collez le code de synchro et tout arrive — passez à l’étape 4. Sinon touchez Commencer de zéro.',
      },
      {
        t: '3. Cinq questions courtes',
        b: 'Langue, sexe (pour les jours d’exemption), le début de votre obligation, si vous priez régulièrement depuis une date, et votre ville. Les horaires sont calculés sur le téléphone ; rien n’est envoyé.',
      },
      {
        t: '4. Aujourd’hui',
        b: 'Cinq prières, chacune avec les rattrapages qui lui reviennent. Touchez une prière, cochez « J’ai prié », confirmez. Le chiffre du cercle baisse aussitôt.',
      },
      {
        t: '5. Corriger une erreur',
        b: 'Rouvrez la même prière : la feuille montre exactement ce qui est enregistré. Décochez un rattrapage, ou la prière elle-même, puis Enregistrer. Le calendrier suit.',
      },
      {
        t: '6. Le calendrier',
        b: 'Une vie entière, mois par mois. Touchez un jour pour voir ses cinq prières, ou utilisez Marquer une période pour enregistrer des mois ou des années d’un coup.',
      },
      {
        t: '7. Progrès et bilan',
        b: 'Progrès montre le restant, votre rythme et la date de fin prévue. Voir le bilan complet ajoute une série, les 28 derniers jours, le meilleur et le plus faible jour, et les quatre dernières semaines.',
      },
      {
        t: '8. Rappels',
        b: 'Réglages → Rappels. Choisissez un délai, des heures de silence et un son. Android affiche un bouton « J’ai prié » sur la notification ; ailleurs, la toucher ouvre la confirmation.',
      },
      {
        t: '9. Sauvegarde et synchro',
        b: 'Réglages → Sauvegarde : exportez un fichier chiffré et gardez-le. Sur un second téléphone, soit vous collez un code de synchro, soit vous importez le fichier — en choisissant Fusionner, pour ne rien perdre.',
      },
      {
        t: '10. Bon à savoir',
        b: 'Apparence : sombre, clair, sépia, minuit, et chiffres arabes. Qibla : une boussole qui suit le téléphone. Widget : aujourd’hui en un coup d’œil. À propos : l’app vérifie une fois par jour les mises à jour et peut l’installer.',
      },      {
        t: '11. La sauvegarde en détail',
        b: 'Réglages → Sauvegarde → Télécharger écrit un fichier chiffré dans vos Téléchargements (sur iPhone, la feuille de partage s’ouvre). Gardez-le dans votre propre cloud. Pour restaurer : choisissez le fichier puis Fusionner — l’union de ce que vous aviez et du fichier — ou Remplacer. Fusionner ne perd jamais une prière.',
      },
      {
        t: '12. Plusieurs personnes',
        b: 'Réglages → Personnes. Chacun a son registre, ses réglages et son code de synchro : deux personnes sur un même téléphone ne partagent jamais un compte. Ajoutez une personne, configurez-la une fois, puis passez de l’une à l’autre en un appui.',
      },
      {
        t: '13. Le widget et les mises à jour',
        b: 'Appui long sur l’écran d’accueil → Widgets → QadaPrayer pour voir la journée en un coup d’œil. Dans Réglages → À propos, l’app vérifie une fois par jour les nouvelles versions et propose Télécharger et installer ; Android demande confirmation, vos données sont conservées.',
      },
      {
        t: '14. Si quelque chose semble faux',
        b: 'Une marque inattendue : ouvrez ce jour dans le calendrier et décochez-la — demain suit toujours le registre, jamais l’inverse. Le compteur ne bouge pas : vérifiez que le rythme n’est pas à zéro (Réglages → Rythme). Rien ne s’affiche : rechargez une fois ; l’app fonctionne hors ligne, vos données sont là.',
      },
    ],
    privacyTitle: 'Confidentialité',
    privacyLead: 'En bref : votre registre ne quitte jamais votre téléphone, sauf si vous l’envoyez.',
    privacyPoints: [
      'Aucun compte, aucune inscription, aucune statistique. L’app ne vous identifie pas.',
      'Tout est stocké dans votre navigateur, sur votre appareil, et fonctionne hors ligne.',
      'L’app ne parle qu’à deux endroits : GitHub, pour vérifier les mises à jour, et — si vous activez la synchro — le petit serveur que vous avez configuré. Les deux ne reçoivent qu’une requête.',
      'La synchro est chiffrée de bout en bout. Le serveur stocke un bloc qu’il ne peut pas lire, sous une clé dérivée de votre code.',
      'Les sauvegardes sont des fichiers que vous créez et gardez. Chiffrez-les avec une phrase secrète si vous voulez.',
      'Effacer les données de l’app, ou la désinstaller, supprime le registre. Exportez une sauvegarde avant — l’app vous le rappelle après un mois.',
      'La version Android demande l’accès réseau, les notifications, et la permission de confier une mise à jour au programme d’installation. Rien d’autre.',
    ],
    privacyFoot: 'Une question sur la confidentialité ? Ouvrez un ticket sur GitHub.',
    appLabel: 'Ouvrir l’app',
    back: 'Retour au site',
    guideLink: 'Guide d’utilisation',
  },

  ar: {
    label: 'العربية',
    guideTitle: 'QadaPrayer — دليل الاستخدام',
    guideLead:
      'كل ما يفعله التطبيق، بالترتيب الذي ستلقاه. عشر دقائق من القراءة، ثم تصبح المسألة لمسة مع كل صلاة.',
    guideSections: [
      {
        t: '١. التثبيت',
        b: 'أندرويد: افتح صفحة الإصدارات، حمّل ملف .apk وثبّته (يسأل أندرويد مرة واحدة بالسماح بالتثبيت من هذا المصدر). آيفون وآيباد: افتح التطبيق في Safari، اضغط مشاركة ← إضافة إلى الشاشة الرئيسية. كلاهما يعمل بلا إنترنت بعد التحميل الأول.',
      },
      {
        t: '٢. الشاشة الأولى تسأل سؤالًا واحدًا',
        b: '«هل تستعمل QadaPrayer من قبل؟» إن كان هاتف آخر يحمل سجلك، الصق رمز المزامنة فيصل كل شيء — انتقل إلى الخطوة ٤. وإلا اضغط البدء من جديد.',
      },
      {
        t: '٣. خمسة أسئلة قصيرة',
        b: 'اللغة، والجنس (لأيام الأعذار)، وبداية التكليف، وهل تصلي بانتظام منذ تاريخ معيّن، ومدينتك. تُحسب الأوقات في الهاتف؛ ولا يُرسل شيء.',
      },
      {
        t: '٤. اليوم',
        b: 'خمس صلوات، ولكل صلاة ما يخصّها من الفوائت. اضغط الصلاة، حدّد «صليت»، وأكّد. ينقص رقم الحلقة مباشرة.',
      },
      {
        t: '٥. تصحيح خطأ',
        b: 'افتح نفس الصلاة مرة أخرى: تعرض النافذة ما هو مسجّل بالضبط. أزل التحديد عن قضاء واحد، أو عن الصلاة نفسها، ثم احفظ. يتحدّث التقويم معها.',
      },
      {
        t: '٦. التقويم',
        b: 'عمر كامل، شهرًا بشهر. اضغط يومًا لترى صلواته الخمس، أو استخدم «تحديد فترة» لتسجيل أشهر أو سنوات دفعة واحدة.',
      },
      {
        t: '٧. التقدّم والحصيلة',
        b: 'يعرض التقدّم الباقي ووتيرتك وتاريخ الانتهاء المتوقع. «الحصيلة الكاملة» تضيف التتابع، والـ٢٨ يومًا الأخيرة، وأفضل يوم وأضعفه، والأسابيع الأربعة الأخيرة.',
      },
      {
        t: '٨. التذكيرات',
        b: 'الإعدادات ← التذكيرات. اختر وقتًا مسبقًا وساعات سكوت وصوتًا. يعرض أندرويد زر «صليت» على التنبيه؛ وفي غيره، لمس التنبيه يفتح التأكيد.',
      },
      {
        t: '٩. النسخ الاحتياطي والمزامنة',
        b: 'الإعدادات ← النسخ الاحتياطي: صدّر ملفًا مشفّرًا واحفظه. في هاتف ثانٍ، إمّا تلصق رمز مزامنة، وإمّا تستورد الملف — واختر «دمج» حتى لا يُفقد شيء.',
      },
      {
        t: '١٠. جدير بالمعرفة',
        b: 'المظهر: داكن، فاتح، بني، ليلي، وأرقام عربية. القبلة: بوصلة تدور مع الهاتف. الودجت: اليوم في لمحة. حول: يتحقق التطبيق من التحديثات مرة يوميًا ويمكنه تثبيتها.',
      },      {
        t: '١١. النسخ الاحتياطي بالتفصيل',
        b: 'الإعدادات ← النسخ الاحتياطي ← تنزيل: يُكتب ملف مشفّر في مجلد التنزيلات (وعلى آيفون يفتح قائمة المشاركة). احفظه في سحابتك. للاستعادة: اختر الملف ثم «دمج» — وهو اتحاد ما لديك وما في الملف — أو «استبدال». الدمج لا يُفقد صلاة.',
      },
      {
        t: '١٢. أكثر من شخص',
        b: 'الإعدادات ← الأشخاص. لكل شخص سجله وإعداداته ورمز مزامنته، فلا يتشارك شخصان عددًا واحدًا. أضف شخصًا، أعدّه مرة، ثم بدّل بلمسة.',
      },
      {
        t: '١٣. الودجت والتحديثات',
        b: 'اضغط مطولًا على الشاشة الرئيسية ← الودجتات ← QadaPrayer لترى يومك في لمحة. وفي الإعدادات ← حول، يتحقق التطبيق مرة يوميًا من الإصدارات ويعرض «تنزيل وتثبيت»؛ وأندرويد يطلب التأكيد وتبقى بياناتك.',
      },
      {
        t: '١٤. إذا بدا شيء خاطئًا',
        b: 'علامة غير متوقعة: افتح ذلك اليوم في التقويم وأزل التحديد — فالغد يتبع السجل دائمًا. العدد لا يتحرك: تأكد أن الوتيرة ليست صفرًا. لا شيء يظهر: أعد التحميل مرة؛ فالتطبيق يعمل بلا إنترنت.',
      },
    ],
    privacyTitle: 'الخصوصية',
    privacyLead: 'باختصار: سجلك لا يغادر هاتفك إلا إذا أرسلته أنت.',
    privacyPoints: [
      'لا حساب ولا تسجيل ولا إحصاءات. التطبيق لا يعرف من أنت.',
      'كل ما تسجّله محفوظ في متصفحك على جهازك، ويعمل بلا إنترنت.',
      'يتصل التطبيق بمكانين فقط: GitHub للتحقق من التحديثات، وإن فعّلت المزامنة، الخادم الصغير الذي أعددته بنفسك. كلاهما لا يستقبل إلا طلبًا.',
      'المزامنة مشفّرة من الطرف إلى الطرف. يخزّن الخادم كتلة لا يستطيع قراءتها، تحت مفتاح مشتق من رمزك.',
      'النسخ الاحتياطية ملفات تنشئها وتحفظها. شفّرها بعبارة سرية إن أردت.',
      'مسح بيانات التطبيق أو حذفه يمحو السجل. صدّر نسخة أولًا — يذكّرك التطبيق بعد شهر.',
      'تطلب نسخة أندرويد: الشبكة، والتنبيهات، والسماح بتسليم تحديث لمثبّت النظام. لا شيء غير ذلك.',
    ],
    privacyFoot: 'لأي سؤال عن الخصوصية: افتح تذكرة على GitHub.',
    appLabel: 'افتح التطبيق',
    back: 'رجوع إلى الموقع',
    guideLink: 'دليل الاستخدام',
  },
};

export const APP_URL = APP;
