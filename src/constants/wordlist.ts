import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['error']

var GRADEWORDS = nogradeyet
const EIGHTGRADE = [
  "avery", "ella", "joselyn", "grant", "havana", "sean", "william", "mitchell", "hannah", "cole", "ryan", "hunter", "hayes", "hailey", "scarlett", "blair", "nicole", "moses", "emma", "amelia", "annabelle", "brad", "emerson", "danny", "andrew", "robert", "sidney-ann", "mcvey", "lillian", "caroline", "aj", "jack", "cesar", "amara", "ray", "ansley", "sophia", "leah", "katherine", "nakhai", "sienna", "luke", "ria", "caroline", "evelyn", "avalina", "tanner", "gavin", "kaitlynne", "will", "chase", "collier", "franklin", "bobby", "hotoniel", "daniel", "sam", "tuck", "emmy", "finn", "jones", "juliana", "maxx", "lilliana", "sophia", "claire", "jules", "meriwether", "elizabeth", "andrew", "layla", "greg", "griffin", "eliana", "emma", "alexa", "ryder", "marley", "bryce", "tyson", "audrey", "brent", "sasha", "jackson", "bralyn", "brooke", "caroline", "eva", "mary", "emma", "felipe", "patrick", "gabriella", "dean", "sarah", "tommy", "margot", "garrett", "margaret", "madeline", "preston", "phillip", "rhodes", "robby", "charlotte", "beatrice", "diego", "christina", "jackson", "eli", "amaree", "george", "kenzo", "tyler", "logan", "nora", "grace", "emma", "brendan", "grayson", "greyson", "katlynn", "madeline", "christian", "davis", "kade", "colt", "claire", "bryce", "matthew", "braiden", "william", "chloe", "teagan", "jack", "betsy", "connor", "jon", "ella", "olivia", "nick", "makayla", "harley", "paige", "grant", "sammy", "grace", "carter", "graham", "jack", "ryder"
];




const SEVENGRADE = [
  'presley',
  'liam',
  'violet',
  'sarah',
  'grayden',
  'lucy',
  'cristiano',
  'alexa',
  'jake',
  'lucas',
  'prakhar',
  'athena',
  'ayden',
  'william',
  'sloane',
  'perry',
  'mia',
  'tristen',
  'davis',
  'crosby',
  'hugh',
  'gailyn',
  'sophia',
  'jackson',
  'logan',
  'cathryn-rose',
  'brayden',
  'mary',
  'isabel',
  'sam',
  'jack',
  'ronan',
  'isabella',
  'elizabeth',
  'lane',
  'sovereign',
  'caroline',
  'samantha',
  'joshua',
  'laura',
  'daniel',
  'daniel',
  'emma',
  'ryan',
  'ryan',
  'turner',
  'wyatt',
  'connor',
  'cole',
  'julia',
  'zoe',
  'isabell',
  'william',
  'vivienne',
  'emily',
  'samuel',
  'patrick',
  'sara',
  'peighton',
  'jay',
  'shane',
  'emerson',
  'hudson',
  'colton',
  'caroline',
  'ryan',
  'riley',
  'edward',
  'cole',
  'addison',
  'coleman',
  'lucas',
  'molly',
  'tenzin',
  'bennett',
  'lydia',
  'gemma',
  'madison',
  'keith',
  'aubrey',
  'strickland',
  'mary',
  'makenzie',
  'chase',
  'charles',
  'eva',
  'ingrid',
  'robert',
  'adair',
  'bryce',
  'henry',
  'divyalakshmi',
  'ellison',
  'andrew',
  'gaines',
  'nicholas',
  'landon',
  'lucas',
  'madeleine',
  'ava',
  'eden',
  'treasure',
  'merrick',
  'xavier',
  'madeline',
  'jude',
  'garrett',
  'richard',
  'joseph',
  'whitney',
  'william',
  'bailey',
  'thomas',
  'bree',
  'james',
  'mary-grace',
  'miller',
]

if (grade == null) {
  var GRADEWORDS = nogradeyet
} else if (grade == '"69"') {
  console.log('nah thats crazy ')
} else if (grade == '"25"') {
  var GRADEWORDS = EIGHTGRADE
} else if (grade == '"7"') {
  var GRADEWORDS = SEVENGRADE
} else if (grade == '"8"') {
  var GRADEWORDS = EIGHTGRADE
} else {
  var GRADEWORDS = nogradeyet
}
export const WORDS = GRADEWORDS
