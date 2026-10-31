/**
 * Landing-page content in the three languages.
 *
 * Source of truth: `tools/build-site.mjs` renders one static page per language
 * from this file, so the three versions can never drift apart.
 */

export const DONATE = {
  kofi: 'https://ko-fi.com/cyberpulseacademy',
  paypal: 'https://www.paypal.com/donate/?hosted_button_id=KNUSPQTVR9WCU',
  repo: 'https://github.com/Souhaieb-Marzouk/QadaPrayer',
  site: 'https://souhaieb-marzouk.github.io/QadaPrayer/',
  app: 'https://souhaieb-marzouk.github.io/QadaPrayer/app/',
};

export const LANGS = [
  { code: 'ar', file: 'index-ar.html', label: 'العربية', dir: 'rtl', locale: 'ar' },
  { code: 'fr', file: 'index-fr.html', label: 'Français', dir: 'ltr', locale: 'fr' },
  { code: 'en', file: 'index.html', label: 'English', dir: 'ltr', locale: 'en' },
];

export const CONTENT = {
  en: {
    meta: {
      title: 'QadaPrayer — catch up on missed prayers, one at a time',
      description:
        'QadaPrayer counts the prayers you still owe and gives you a calm, steady plan to make them up. Offline on Android and iPhone. Free, open source, no account.',
    },
    nav: {
      features: 'Features',
      screens: 'Screens',
      how: 'How it works',
      install: 'Install',
      support: 'Support',
      download: 'Download',
      tip: 'Tip',
    },
    hero: {
      eyebrow: 'Free · Open source · No account',
      h1a: 'Catch up on what you owe,',
      h1b: 'one prayer at a time.',
      lead:
        'QadaPrayer counts the prayers left from your whole life, then folds a small, steady number of make-ups into the five prayers you are praying today. No guilt, no guesswork — just a number that goes down.',
      ctaPrimary: 'Get the app',
      ctaSecondary: 'Try it in your browser',
      fact1: 'Works fully offline',
      fact2: 'Arabic · English · Français',
      fact3: 'Your data never leaves your phone',
    },
    demo: { caption: 'Live demo — tap around, it runs entirely in your browser.' },
    features: {
      title: 'Built around one question: what do I still owe?',
      lead: '',
      items: [
        {
          t: 'A lifetime ledger',
          b: 'From the day you reached puberty until today, every prayer has a place. Mark whole days, months or years as done — the count always stays honest.',
        },
        {
          t: 'Make-ups woven into today',
          b: 'Choose how many days to make up per day. QadaPrayer spreads them across your five prayers, in order, so catching up never feels like a second job.',
        },
        {
          t: 'Change your pace, keep your history',
          b: 'Start ambitious, slow down later. Lowering your daily pace never rewrites a single prayer you already made up.',
        },
        {
          t: 'Prayer times that fit you',
          b: 'Calculated on your phone for your city, with the calculation method, Asr shadow and per-prayer minute offsets you can adjust to match your mosque.',
        },
        {
          t: 'For everyone who prays',
          b: 'Exemption days are supported, so the count follows what you actually owe — not a generic calendar.',
        },
        {
          t: 'Private by construction',
          b: 'No accounts, no servers, no analytics. Backups are files you own, optionally encrypted with your own passphrase.',
        },
      ],
    },
    screens: {
      title: 'The whole app, nothing hidden.',
      lead: 'These are the real screens, rendered live by your browser — not mock-ups.',
      captions: [
        'Today — five prayers with their make-ups',
        'Calendar — a whole lifetime, month by month',
        'Progress — remaining, pace and finish date',
        'Arabic, right to left, same app',
      ],
    },
    how: {
      title: 'Four minutes to set up. Then one tap a prayer.',
      lead: '',
      steps: [
        {
          t: 'Tell it when your obligation began',
          b: 'Puberty, not a fixed age. If you are unsure, pick the earliest plausible date — the app explains why over-counting is the safer mistake.',
        },
        {
          t: 'Mark what you already prayed',
          b: 'If you have been praying regularly for years, say since when. Everything after that date is marked as done in one go.',
        },
        {
          t: 'Pick a pace you can actually keep',
          b: 'One day of make-ups per day means one extra prayer with each prayer. Change it whenever you like.',
        },
        { t: 'Pray, tap, repeat', b: 'Under each prayer you see the make-ups that belong to it — with the exact dates. Confirm, and the number drops.' },
      ],
    },
    install: {
      title: 'Android in a minute, iPhone in two.',
      lead:
        'QadaPrayer is a progressive web app: it installs from the browser, works offline, and needs no store account. The Android package is published on the releases page.',
      android: {
        title: 'Android',
        sub: 'No Play Store needed.',
        steps: [
          { t: 'Download the latest APK', b: 'Open the releases page and tap the newest .apk file.' },
          { t: 'Allow install from this source', b: 'Android asks once: Settings → Allow from this source. Normal for any app outside a store.' },
          { t: 'Open and set up', b: 'Four short steps, then the app works offline forever.' },
        ],
        cta: 'Open releases',
        note: 'Prefer automatic updates? Add the repository URL in Obtainium and it installs each new release for you.',
      },
      ios: {
        title: 'iPhone & iPad',
        sub: 'Works in Safari, no developer account.',
        steps: [
          { t: 'Open the app in Safari', b: 'Tap “Try it in your browser” above, or the link below.' },
          { t: 'Tap Share, then “Add to Home Screen”', b: 'The glyph is the square with an arrow, at the bottom of the screen.' },
          { t: 'Tap “Add”', b: 'QadaPrayer now opens full-screen from your home screen and keeps working offline.' },
        ],
        cta: 'Open the web app',
        note: 'A packaged iOS build is possible too, but it needs a Mac and an Apple developer account to sign. The home-screen install above needs neither.',
      },
    },
    support: {
      eyebrow: 'Support',
      title: 'It is free, and it stays free.',
      lead:
        'QadaPrayer is open source and collects nothing — there is no ads slot to sell. If it earned a place in your day, a tip keeps the updates coming.',
      funny:
        'No ads, no subscription, no guilt-trip. A coffee if you are feeling generous — and a duʿāʾ if you are not. Both count.',
      kofi: 'Buy me a coffee',
      paypal: 'Give with PayPal',
      note: 'Ko-fi and PayPal. One-time, no account required on your side.',
    },
    faq: {
      title: 'Short answers.',
      items: [
        { q: 'Is this a fatwa?', a: 'No. QadaPrayer is a personal tracker built on the Maliki position that missed prayers must be made up. For your own situation, ask a qualified scholar.' },
        { q: 'Where is my data stored?', a: 'In your browser’s local storage, on your device. There is no server and no account. Export an encrypted backup from Settings.' },
        { q: 'What happens if I change my pace?', a: 'Only the future changes. Every prayer you already marked stays exactly as it was, and the remaining make-ups are redistributed from that point on.' },
        { q: 'Does it work without internet?', a: 'Yes. Prayer times are computed on the device and everything else is local. After the first load the app runs fully offline.' },
      ],
    },
    footer: {
      note: 'Free and open source. Built to be private by default.',
      app: 'Open the app',
      source: 'Source code',
      licence: 'Licence',
      tip: 'Leave a tip',
    },
  },

  fr: {
    meta: {
      title: 'QadaPrayer — rattraper les prières manquées, une à la fois',
      description:
        'QadaPrayer compte les prières qu’il vous reste à rattraper et propose un plan calme et régulier pour les faire. Hors ligne sur Android et iPhone. Gratuit, open source, sans compte.',
    },
    nav: {
      features: 'Fonctions',
      screens: 'Écrans',
      how: 'Comment ça marche',
      install: 'Installer',
      support: 'Soutenir',
      download: 'Télécharger',
      tip: 'Tip',
    },
    hero: {
      eyebrow: 'Gratuit · Open source · Sans compte',
      h1a: 'Rattrapez ce qui vous est dû,',
      h1b: 'une prière à la fois.',
      lead:
        'QadaPrayer compte les prières restantes de toute une vie, puis glisse un petit nombre régulier de rattrapages dans les cinq prières du jour. Sans culpabilité, sans approximation — juste un chiffre qui baisse.',
      ctaPrimary: 'Obtenir l’app',
      ctaSecondary: 'Essayer dans le navigateur',
      fact1: 'Fonctionne hors ligne',
      fact2: 'Arabe · Anglais · Français',
      fact3: 'Vos données restent sur votre téléphone',
    },
    demo: { caption: 'Démo en direct — cliquez, tout tourne dans votre navigateur.' },
    features: {
      title: 'Autour d’une seule question : que me reste-t-il ?',
      lead: '',
      items: [
        { t: 'Un registre de toute une vie', b: 'Du jour de la puberté à aujourd’hui, chaque prière a sa place. Marquez des jours, des mois ou des années entières — le compte reste honnête.' },
        { t: 'Des rattrapages dans la journée', b: 'Choisissez combien de journées rattraper par jour. QadaPrayer les répartit sur vos cinq prières, dans l’ordre, sans que cela devienne un second travail.' },
        { t: 'Changez de rythme, gardez l’historique', b: 'Commencez ambitieux, ralentissez ensuite. Baisser le rythme ne réécrit jamais une prière déjà rattrapée.' },
        { t: 'Des horaires qui vous ressemblent', b: 'Calculés sur votre téléphone pour votre ville, avec la méthode, l’ombre du Asr et des décalages par prière pour coller à votre mosquée.' },
        { t: 'Pour toutes et tous', b: 'Les jours d’exemption sont pris en compte : le compte suit ce que vous devez réellement.' },
        { t: 'Privé par construction', b: 'Pas de compte, pas de serveur, pas de statistiques. Les sauvegardes sont des fichiers à vous, chiffrables.' },
      ],
    },
    screens: {
      title: 'Toute l’app, rien de caché.',
      lead: 'Ce sont les vrais écrans, affichés par votre navigateur — pas des maquettes.',
      captions: [
        'Aujourd’hui — cinq prières et leurs rattrapages',
        'Calendrier — une vie entière, mois par mois',
        'Progrès — restant, rythme et date de fin',
        'L’arabe, de droite à gauche, même app',
      ],
    },
    how: {
      title: 'Quatre minutes pour installer. Ensuite, un appui par prière.',
      lead: '',
      steps: [
        { t: 'Dites quand l’obligation a commencé', b: 'La puberté, pas un âge fixe. En cas de doute, prenez la date la plus ancienne plausible : mieux vaut compter un peu plus.' },
        { t: 'Marquez ce que vous avez déjà prié', b: 'Si vous priez régulièrement depuis des années, indiquez depuis quand : tout ce qui suit est marqué comme fait.' },
        { t: 'Choisissez un rythme tenable', b: 'Une journée de rattrapage par jour, c’est une prière en plus avec chaque prière. Modifiable à tout moment.' },
        { t: 'Priez, appuyez, recommencez', b: 'Sous chaque prière, les rattrapages qui lui reviennent — avec leurs dates. Confirmez, le chiffre baisse.' },
      ],
    },
    install: {
      title: 'Android en une minute, iPhone en deux.',
      lead:
        'QadaPrayer est une app web progressive : elle s’installe depuis le navigateur, fonctionne hors ligne et n’exige aucun compte de store. Le paquet Android est publié dans les releases.',
      android: {
        title: 'Android',
        sub: 'Sans Play Store.',
        steps: [
          { t: 'Téléchargez le dernier APK', b: 'Ouvrez la page des releases et touchez le fichier .apk le plus récent.' },
          { t: 'Autorisez l’installation', b: 'Android demande une fois : Réglages → Autoriser depuis cette source. Normal hors store.' },
          { t: 'Ouvrez et configurez', b: 'Quatre étapes, puis l’app fonctionne hors ligne pour de bon.' },
        ],
        cta: 'Voir les releases',
        note: 'Vous préférez les mises à jour automatiques ? Ajoutez l’URL du dépôt dans Obtainium.',
      },
      ios: {
        title: 'iPhone et iPad',
        sub: 'Fonctionne dans Safari, sans compte développeur.',
        steps: [
          { t: 'Ouvrez l’app dans Safari', b: 'Touchez « Essayer dans le navigateur » ci-dessus, ou le lien ci-dessous.' },
          { t: 'Touchez Partager puis « Sur l’écran d’accueil »', b: 'L’icône est le carré avec une flèche, en bas de l’écran.' },
          { t: 'Touchez « Ajouter »', b: 'QadaPrayer s’ouvre alors en plein écran et continue de fonctionner hors ligne.' },
        ],
        cta: 'Ouvrir l’app web',
        note: 'Une version iOS empaquetée est possible, mais il faut un Mac et un compte Apple payant. L’installation ci-dessus n’exige ni l’un ni l’autre.',
      },
    },
    support: {
      eyebrow: 'Soutenir',
      title: 'C’est gratuit, et ça le reste.',
      lead:
        'QadaPrayer est open source et ne collecte rien — il n’y a pas d’emplacement publicitaire à vendre. S’il a trouvé sa place dans vos journées, un pourboire fait vivre les mises à jour.',
      funny:
        'Pas de pub, pas d’abonnement, pas de culpabilisation. Un café si le cœur vous en dit — et une duʿāʾ sinon. Les deux comptent.',
      kofi: 'Offrir un café',
      paypal: 'Donner via PayPal',
      note: 'Ko-fi et PayPal. Paiement unique, aucun compte requis de votre côté.',
    },
    faq: {
      title: 'Réponses courtes.',
      items: [
        { q: 'Est-ce une fatwa ?', a: 'Non. QadaPrayer est un suivi personnel fondé sur la position malikite : les prières manquées doivent être rattrapées. Pour votre cas, consultez un savant.' },
        { q: 'Où sont mes données ?', a: 'Dans le stockage local de votre navigateur, sur votre appareil. Aucun serveur, aucun compte. Exportez une sauvegarde chiffrée depuis les réglages.' },
        { q: 'Et si je change de rythme ?', a: 'Seul l’avenir change. Chaque prière déjà marquée reste intacte, et le reste est redistribué à partir de ce point.' },
        { q: 'Sans internet ?', a: 'Oui. Les horaires sont calculés sur l’appareil et tout le reste est local. Après le premier chargement, l’app fonctionne hors ligne.' },
      ],
    },
    footer: {
      note: 'Gratuit et open source. Privé par défaut.',
      app: 'Ouvrir l’app',
      source: 'Code source',
      licence: 'Licence',
      tip: 'Laisser un pourboire',
    },
  },

  ar: {
    meta: {
      title: 'QadaPrayer — اقضِ ما فاتك من الصلوات، واحدةً في كل مرة',
      description:
        'يحصي QadaPrayer الصلوات الباقية عليك، ويعطيك خطة هادئة ومنتظمة لقضائها. يعمل بلا إنترنت على أندرويد وآيفون. مجاني ومفتوح المصدر وبلا حساب.',
    },
    nav: {
      features: 'المزايا',
      screens: 'الشاشات',
      how: 'كيف يعمل',
      install: 'التثبيت',
      support: 'ادعم',
      download: 'تحميل',
      tip: 'إكرامية',
    },
    hero: {
      eyebrow: 'مجاني · مفتوح المصدر · بلا حساب',
      h1a: 'اقضِ ما بقي عليك،',
      h1b: 'صلاةً في كل مرة.',
      lead:
        'يحصي QadaPrayer الصلوات الباقية من عمرك كله، ثم يوزّع عددًا صغيرًا وثابتًا من الفوائت على صلواتك الخمس اليومية. بلا لوم ولا تخمين — فقط رقم ينقص.',
      ctaPrimary: 'حمّل التطبيق',
      ctaSecondary: 'جرّبه في المتصفح',
      fact1: 'يعمل بلا إنترنت',
      fact2: 'العربية · الإنجليزية · الفرنسية',
      fact3: 'بياناتك لا تغادر هاتفك',
    },
    demo: { caption: 'عرض حيّ — جرّب بنفسك، كل شيء يعمل داخل متصفحك.' },
    features: {
      title: 'كل شيء يدور حول سؤال واحد: ما الذي بقي عليّ؟',
      lead: '',
      items: [
        { t: 'سجلّ العمر كله', b: 'من يوم البلوغ إلى اليوم، ولكل صلاة موضع. سجّل أيامًا أو أشهرًا أو سنوات كاملة بلمسة، ويبقى العدّ صادقًا.' },
        { t: 'القضاء مدسوس في يومك', b: 'اختر كم يومًا تقضي كل يوم. يوزّعها التطبيق على صلواتك الخمس بالترتيب، فلا يصير القضاء عملًا ثانيًا.' },
        { t: 'غيّر وتيرتك واحفظ سجلك', b: 'ابدأ بطموح ثم خفّف. تقليل الوتيرة لا يعيد كتابة صلاة قضيتها.' },
        { t: 'أوقات تناسبك', b: 'تُحسب في هاتفك لمدينتك، مع طريقة الحساب وظلّ العصر ودقائق تعديل لكل صلاة لتطابق مسجدك.' },
        { t: 'للجميع', b: 'أيام الأعذار مدعومة، فيتبع العدّ ما عليك فعلًا لا تقويمًا عامًا.' },
        { t: 'خصوصية بالتصميم', b: 'لا حسابات ولا خوادم ولا إحصاءات. النسخ الاحتياطية ملفات تملكها أنت، ويمكن تشفيرها.' },
      ],
    },
    screens: {
      title: 'التطبيق كله، بلا إخفاء.',
      lead: 'هذه شاشات حقيقية يعرضها متصفحك الآن — لا صور تجريبية.',
      captions: [
        'اليوم — الصلوات الخمس وقضاؤها',
        'التقويم — عمر كامل، شهرًا بشهر',
        'التقدّم — الباقي والوتيرة وتاريخ الانتهاء',
        'الواجهة العربية، من اليمين إلى اليسار',
      ],
    },
    how: {
      title: 'أربع دقائق للتهيئة، ثم لمسة مع كل صلاة.',
      lead: '',
      steps: [
        { t: 'حدّد بداية التكليف', b: 'البلوغ لا سنًّا محددة. إن لم تكن متأكدًا فاختر أقدم تاريخ محتمل؛ فاحتساب الزائد أأمن.' },
        { t: 'سجّل ما صليته فعلًا', b: 'إن كنت تصلي بانتظام منذ سنوات فحدّد متى؛ كل ما بعد ذلك يُسجَّل كأنه أُدّي.' },
        { t: 'اختر وتيرة تقدر عليها', b: 'يوم واحد من القضاء يوميًا يعني صلاة إضافية مع كل صلاة. يمكن تغييره متى شئت.' },
        { t: 'صلِّ، سجّل، وكرّر', b: 'تحت كل صلاة ترى الفوائت المخصّصة لها بتواريخها. أكّد، فينقص الرقم.' },
      ],
    },
    install: {
      title: 'أندرويد في دقيقة، وآيفون في دقيقتين.',
      lead:
        'QadaPrayer تطبيق ويب تقدّمي: يُثبَّت من المتصفح، يعمل بلا إنترنت، ولا يحتاج حساب متجر. حزمة أندرويد منشورة في صفحة الإصدارات.',
      android: {
        title: 'أندرويد',
        sub: 'بلا حاجة إلى متجر Play.',
        steps: [
          { t: 'حمّل أحدث APK', b: 'افتح صفحة الإصدارات واضغط أحدث ملف .apk.' },
          { t: 'اسمح بالتثبيت من هذا المصدر', b: 'يسأل أندرويد مرة: الإعدادات ← السماح من هذا المصدر. أمر عادي خارج المتجر.' },
          { t: 'افتح وابدأ', b: 'أربع خطوات قصيرة، ثم يعمل التطبيق بلا إنترنت دائمًا.' },
        ],
        cta: 'صفحة الإصدارات',
        note: 'تريد تحديثات تلقائية؟ أضف رابط المستودع في Obtainium ليُثبّت كل إصدار جديد.',
      },
      ios: {
        title: 'آيفون وآيباد',
        sub: 'يعمل في Safari، بلا حساب مطوّر.',
        steps: [
          { t: 'افتح التطبيق في Safari', b: 'اضغط «جرّبه في المتصفح» أعلاه أو الرابط أدناه.' },
          { t: 'اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية»', b: 'الرمز مربّع بسهم في أسفل الشاشة.' },
          { t: 'اضغط «إضافة»', b: 'يفتح QadaPrayer بملء الشاشة ويواصل العمل بلا إنترنت.' },
        ],
        cta: 'افتح التطبيق',
        note: 'يمكن بناء نسخة iOS مستقلة، لكنها تحتاج جهاز Mac وحساب مطوّر مدفوعًا. الطريقة أعلاه لا تحتاج شيئًا من ذلك.',
      },
    },
    support: {
      eyebrow: 'الدعم',
      title: 'مجاني، وسيبقى مجانيًا.',
      lead:
        'QadaPrayer مفتوح المصدر ولا يجمع شيئًا — لا يوجد مكان إعلاني يُباع. إن وجد مكانًا في يومك، فإكرامية صغيرة تُبقي التحديثات مستمرة.',
      funny: 'لا إعلانات، لا اشتراكات، ولا لوم على أحد. فنجان قهوة إن أردت — ودعاء صادق إن لم تُرد. الاثنان يُحتسبان.',
      kofi: 'قهوة على Ko-fi',
      paypal: 'تبرّع عبر PayPal',
      note: 'Ko-fi وPayPal. دفعة واحدة، ولا حاجة إلى حساب من جهتك.',
    },
    faq: {
      title: 'أجوبة قصيرة.',
      items: [
        { q: 'هل هذا فتوى؟', a: 'لا. QadaPrayer أداة متابعة شخصية مبنية على مذهب المالكية في وجوب قضاء الفوائت. لحالتك الخاصة اسأل عالمًا.' },
        { q: 'أين تُحفظ بياناتي؟', a: 'في التخزين المحلي لمتصفحك، على جهازك. لا خادم ولا حساب. صدّر نسخة مشفّرة من الإعدادات.' },
        { q: 'ماذا لو غيّرت وتيرتي؟', a: 'المستقبل فقط يتغيّر. كل صلاة سجّلتها تبقى كما هي، ويُعاد توزيع الباقي من تلك النقطة.' },
        { q: 'هل يعمل بلا إنترنت؟', a: 'نعم. تُحسب الأوقات في الجهاز وكل ما عداه محلي. بعد التحميل الأول يعمل التطبيق بلا اتصال.' },
      ],
    },
    footer: {
      note: 'مجاني ومفتوح المصدر. خصوصية افتراضيًا.',
      app: 'افتح التطبيق',
      source: 'الشيفرة',
      licence: 'الرخصة',
      tip: 'اترك إكرامية',
    },
  },
};
