import type { PrayerName } from './prayers';

// Arabic and Pickthall translation from the app's bundled, attributed Quran text.
export const prayerReminders: Record<
  PrayerName,
  { verses: { text: string; number: number }[]; translation: string; reference: string }
> = {
  Fajr: {
    verses: [
      {
        text: 'أَقِمِ ٱلصَّلَوٰةَ لِدُلُوكِ ٱلشَّمْسِ إِلَىٰ غَسَقِ ٱلَّيْلِ وَقُرْءَانَ ٱلْفَجْرِ إِنَّ قُرْءَانَ ٱلْفَجْرِ كَانَ مَشْهُودًا',
        number: 78,
      },
    ],
    translation:
      "Establish worship at the going down of the sun until the dark of night, and (the recital of) the Qur'an at dawn. Lo! (the recital of) the Qur'an at dawn is ever witnessed.",
    reference: 'Al-Isra · 17:78',
  },
  Dhuhr: {
    verses: [
      {
        text: 'وَأَقِيمُوا۟ ٱلصَّلَوٰةَ وَءَاتُوا۟ ٱلزَّكَوٰةَ وَٱرْكَعُوا۟ مَعَ ٱلرَّٰكِعِينَ',
        number: 43,
      },
    ],
    translation:
      'Establish worship, pay the poor-due, and bow your heads with those who bow (in worship).',
    reference: 'Al-Baqarah · 2:43',
  },
  Asr: {
    verses: [
      {
        text: 'حَٰفِظُوا۟ عَلَى ٱلصَّلَوَٰتِ وَٱلصَّلَوٰةِ ٱلْوُسْطَىٰ وَقُومُوا۟ لِلَّهِ قَٰنِتِينَ',
        number: 238,
      },
    ],
    translation:
      'Be guardians of your prayers, and of the midmost prayer, and stand up with devotion to Allah.',
    reference: 'Al-Baqarah · 2:238',
  },
  Maghrib: {
    verses: [
      {
        text: 'قَدْ أَفْلَحَ ٱلْمُؤْمِنُونَ',
        number: 1,
      },
      {
        text: 'ٱلَّذِينَ هُمْ فِى صَلَاتِهِمْ خَٰشِعُونَ',
        number: 2,
      },
    ],
    translation: 'Successful indeed are the believers. Who are humble in their prayers.',
    reference: 'Al-Mu’minun · 23:1–2',
  },
  Isha: {
    verses: [
      {
        text: 'وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى ٱلْخَٰشِعِينَ',
        number: 45,
      },
    ],
    translation:
      'Seek help in patience and prayer; and truly it is hard save for the humble-minded.',
    reference: 'Al-Baqarah · 2:45',
  },
};

export function renderPrayerReminder(root: HTMLElement, prayer: PrayerName) {
  const reminder = prayerReminders[prayer];
  const arabic = root.querySelector<HTMLElement>('.reminder-arabic')!;
  arabic.replaceChildren();
  reminder.verses.forEach((verse, index) => {
    arabic.append(document.createTextNode(verse.text));
    if (index < reminder.verses.length - 1) {
      const marker = document.createElement('span');
      marker.className = 'ayah-number';
      marker.textContent = new Intl.NumberFormat('ar-EG', { useGrouping: false }).format(
        verse.number,
      );
      marker.setAttribute('aria-label', 'Ayah ' + verse.number);
      arabic.append(document.createTextNode(' '), marker, document.createTextNode(' '));
    }
  });
  root.querySelector<HTMLElement>('.reminder-translation')!.textContent = reminder.translation;
  root.querySelector<HTMLElement>('.reminder-reference')!.textContent =
    reminder.reference + ' · Translated by M. M. Pickthall';
}
