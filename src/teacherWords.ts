// Teacher last names — used for the Teachers daily game mode and Teachers bonus round
// Rules: all-alphabetic (no hyphens/spaces), 5–8 letters only
// so the board length is manageable and there are always enough valid guesses.

const firstGameDate = new Date(2023, 2, 1)

const getToday = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

const getGameDate = () => getToday()

const getIndex = (gameDate: Date) => {
  let start = firstGameDate
  let index = -1
  do {
    index++
    start = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1)
  } while (start <= gameDate)

  return index
}

const localeAwareUpperCase = (text: string) => {
  return process.env.REACT_APP_LOCALE_STRING
    ? text.toLocaleUpperCase(process.env.REACT_APP_LOCALE_STRING)
    : text.toUpperCase()
}

export const TEACHER_WORDS: string[] = [
  'adams',
  'allan',
  'alvarado',
  'aquino',
  'austin',
  'avouris',
  'bange',
  'baroody',
  'bassett',
  'bradford',
  'cagle',
  'cameron',
  'codlin',
  'conway',
  'cornwell',
  'cruce',
  'dickey',
  'domescik',
  'dyche',
  'forman',
  'gainer',
  'graham',
  'graves',
  'gregory',
  'harper',
  'harvey',
  'jackson',
  'jeffres',
  'johnson',
  'klein',
  'kraner',
  'lamback',
  'locurto',
  'lozier',
  'lundy',
  'makkers',
  'matthews',
  'mavity',
  'mckibbon',
  'mills',
  'montalvo',
  'notario',
  'peckham',
  'pendrick',
  'perrotta',
  'pilkey',
  'reiss',
  'rivera',
  'rowland',
  'rutledge',
  'santana',
  'santee',
  'sautter',
  'scholz',
  'shumpert',
  'spayd',
  'staples',
  'stetson',
  'suarez',
  'swain',
  'swann',
  'taylor',
  'teague',
  'terry',
  'thompson',
  'tongren',
  'townsend',
  'tuohy',
  'turner',
  'waken',
  'walker',
  'walsh',
  'white',
  'wright',
]

// Full teacher name list for the teacher bonus round — all alpha-only names, 4+ letters.
// Includes names that are too short/long for daily but still valid for the bonus.
// Excludes names with hyphens or spaces (karres-williams, rodriguez padial) since they
// cannot be entered on the keyboard grid.
export const TEACHER_WORDS_FULL: string[] = [
  'adams',
  'allan',
  'alvarado',
  'aquino',
  'austin',
  'avouris',
  'bange',
  'baroody',
  'bassett',
  'batchelor',
  'baum',
  'bradford',
  'cagle',
  'cameron',
  'codlin',
  'conway',
  'cornwell',
  'cruce',
  'dickey',
  'domescik',
  'dominique',
  'dyche',
  'elms',
  'forman',
  'forrester',
  'frye',
  'gainer',
  'graham',
  'graves',
  'gregory',
  'harper',
  'harvey',
  'hite',
  'jackson',
  'jeffres',
  'johnson',
  'klein',
  'kraner',
  'kreinheder',
  'lamback',
  'locurto',
  'lozier',
  'lundy',
  'makkers',
  'many',
  'matthews',
  'mavity',
  'mays',
  'mckibbon',
  'mills',
  'montalvo',
  'notario',
  'peckham',
  'pendrick',
  'perrotta',
  'pilkey',
  'reed',
  'reiss',
  'rivera',
  'rowe',
  'rowland',
  'rutledge',
  'sammataro',
  'santana',
  'santee',
  'sautter',
  'scholz',
  'shumpert',
  'spayd',
  'staples',
  'stetson',
  'strickland',
  'suarez',
  'swain',
  'swann',
  'taylor',
  'teague',
  'terry',
  'thompson',
  'tongren',
  'townsend',
  'tumbleson',
  'tuohy',
  'turner',
  'waken',
  'walker',
  'walsh',
  'washington',
  'white',
  'wright',
]

// Teacher bonus solution — uses the full name list with a different offset from the daily,
// so the bonus word never repeats the same day's daily word.
export const getTeachersBonusSolution = (): string => {
  const gameDate = getGameDate()
  const index = getIndex(gameDate)
  // Offset by ~60% of the list so bonus differs from daily (offset 13 from teachers daily offset of 0)
  const offset = Math.floor(TEACHER_WORDS_FULL.length * 0.6)
  return localeAwareUpperCase(
    TEACHER_WORDS_FULL[(index + offset) % TEACHER_WORDS_FULL.length]
  )
}
