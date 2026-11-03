/**
 * The six walkthrough parts, in three languages.
 *
 * Drop the encoded files in site/media/ as part-1.mp4 … part-6.mp4 and the page
 * tools/build-videos.mjs generates plays them straight from GitHub Pages.
 */

export const VIDEOS = [
  {
    file: 'part-1.mp4',
    poster: 'part-1.jpg',
    en: { t: 'Install and first open', d: 'Getting the app on the phone, and the language screen.' },
    fr: { t: 'Installer et ouvrir', d: 'Mettre l’app sur le téléphone, et l’écran de langue.' },
    ar: { t: 'التثبيت وأول تشغيل', d: 'تحميل التطبيق على الهاتف، وشاشة اللغة.' },
  },
  {
    file: 'part-2.mp4',
    poster: 'part-2.jpg',
    en: { t: 'The five questions', d: 'Puberty date, city, and the pace you can keep.' },
    fr: { t: 'Les cinq questions', d: 'Date de puberté, ville, et le rythme tenable.' },
    ar: { t: 'الأسئلة الخمسة', d: 'تاريخ البلوغ، المدينة، والوتيرة الممكنة.' },
  },
  {
    file: 'part-3.mp4',
    poster: 'part-3.jpg',
    en: { t: 'Today, prayer by prayer', d: 'Marking, correcting, and the make-ups under each prayer.' },
    fr: { t: 'Aujourd’hui, prière par prière', d: 'Marquer, corriger, et les rattrapages sous chaque prière.' },
    ar: { t: 'اليوم، صلاة بصلاة', d: 'التسجيل، التصحيح، والفوائت تحت كل صلاة.' },
  },
  {
    file: 'part-4.mp4',
    poster: 'part-4.jpg',
    en: { t: 'The calendar and bulk edit', d: 'Marking whole months, and the excused days.' },
    fr: { t: 'Le calendrier et l’édition en masse', d: 'Marquer des mois entiers, et les jours excusés.' },
    ar: { t: 'التقويم والتحديد الشامل', d: 'تسجيل أشهر كاملة، والأيام المعذورة.' },
  },
  {
    file: 'part-5.mp4',
    poster: 'part-5.jpg',
    en: { t: 'Progress and review', d: 'The projected finish, the streak, and the four-week review.' },
    fr: { t: 'Progrès et bilan', d: 'La date de fin prévue, la série, et le bilan de quatre semaines.' },
    ar: { t: 'التقدّم والحصيلة', d: 'تاريخ الانتهاء المتوقع، والتتابع، وحصيلة أربعة أسابيع.' },
  },
  {
    file: 'part-6.mp4',
    poster: 'part-6.jpg',
    en: { t: 'Reminders, backup and sync', d: 'Notifications, the encrypted file, and two phones.' },
    fr: { t: 'Rappels, sauvegarde et synchro', d: 'Notifications, fichier chiffré, et deux téléphones.' },
    ar: { t: 'التذكيرات والنسخ والمزامنة', d: 'التنبيهات، الملف المشفّر، وهاتفان.' },
  },
];
