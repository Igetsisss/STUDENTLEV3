import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['jack']

var GRADEWORDS = nogradeyet
const EIGHTGRADE = [
  "avery", "ella", "joselyn", "grant", "havana", "sean", "william", "mitchell", "hannah", "cole", "ryan", "hunter", "hayes", "hailey", "scarlett", "blair", "nicole", "moses", "emma", "amelia", "annabelle", "brad", "emerson", "danny", "andrew", "robert", "sidney-ann", "mcvey", "lillian", "caroline", "aj", "jack", "cesar", "amara", "ray", "ansley", "sophia", "leah", "katherine", "nakhai", "sienna", "luke", "ria", "caroline", "evelyn", "avalina", "tanner", "gavin", "kaitlynne", "will", "chase", "collier", "franklin", "bobby", "hotoniel", "daniel", "sam", "tuck", "emmy", "finn", "jones", "juliana", "maxx", "lilliana", "sophia", "claire", "jules", "meriwether", "elizabeth", "andrew", "layla", "greg", "griffin", "eliana", "emma", "alexa", "ryder", "marley", "bryce", "tyson", "audrey", "brent", "sasha", "jackson", "bralyn", "brooke", "caroline", "eva", "mary", "emma", "felipe", "patrick", "gabriella", "dean", "sarah", "tommy", "margot", "garrett", "margaret", "madeline", "preston", "phillip", "rhodes", "robby", "charlotte", "beatrice", "diego", "christina", "jackson", "eli", "amaree", "george", "kenzo", "tyler", "logan", "nora", "grace", "emma", "brendan", "grayson", "greyson", "katlynn", "madeline", "christian", "davis", "kade", "colt", "claire", "bryce", "matthew", "braiden", "william", "chloe", "teagan", "jack", "betsy", "connor", "jon", "ella", "olivia", "nick", "makayla", "harley", "paige", "grant", "sammy", "grace", "carter", "graham", "jack", "ryder"
];

const SEVENGRADE = [
  'andrew',
  'madison',
  'tristen',
  'brayden',
  'xavier',
  'jake',
  'joseph',
  'madeline',
  'mary',
  'strickland',
  'ingrid',
  'jackson',
  'zoe',
  'bennett',
  'nicholas',
  'william',
  'cole',
  'bailey',
  'tenzin',
  'keith',
  'ronan',
  'lucas',
  'eden',
  'bree',
  'eva',
  'vivienne',
  'liam',
  'jack',
  'lane',
  'hudson',
  'thomas',
  'perry',
  'ryan',
  'edward',
  'garrett',
  'richard',
  'gaines',
  'wyatt',
  'emma',
  'bryce',
  'henry',
  'grayden',
  'emily',
  'samuel',
  'william',
  'laura',
  'elizabeth',
  'lydia',
  'davis',
  'jay',
  'samantha',
  'isabella',
  'sloane',
  'violet',
  'sara',
  'cathryn-rose',
  'mary-grace',
  'cristiano',
  'whitney',
  'addison',
  'ellison',
  'charles',
  'isabel',
  'peighton',
  'isabell',
  'mary',
  'julia',
  'ryan',
  'crosby',
  'gemma',
  'sophia',
  'daniel',
  'hugh',
  'alexa',
  'merrick',
  'landon',
  'connor',
  'robert',
  'ayden',
  'emerson',
  'caroline',
  'lucas',
  'lucy',
  'turner',
  'joshua',
  'coleman',
  'chase',
  'ava',
  'prakhar',
  'mia',
  'sovereign',
  'riley',
  'daniel',
  'james',
  'cole',
  'jude',
  'sarah',
  'madeleine',
  'molly',
  'shane',
  'miller',
  'presley',
  'lucas',
  'aubrey',
  'caroline',
  'gailyn',
  'logan',
  'makenzie',
  'william',
  'adair',
  'athena',
  'treasure',
  'sam',
  'colton',
  'patrick',
  'ryan',
  'divyalakshmi',
]

if (grade == null) {
  var GRADEWORDS = nogradeyet
}
if (grade == '"69"') {
  console.log('nah thats crazy ')
}
if (grade == '"25"') {
  var GRADEWORDS = EIGHTGRADE
}
if (grade == '"7"') {
  var GRADEWORDS = SEVENGRADE
}
if (grade == '"8"') {
  var GRADEWORDS = EIGHTGRADE
} else {
  var GRADEWORDS = nogradeyet
}
export const VALID_GUESSES = GRADEWORDS
