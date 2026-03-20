import { GradeNumber, loadGradeFromLocalStorage, saveGradeToLocalStorage, } from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['error']
var GRADEWORDS = nogradeyet

const ELEVENTHGRADE = [
    "emerson", "william", "mitchell", "rhodes", "daniel", "brooke", "avery", "harris", "grant", "madeline", "cesar",
    "gavin", "davis", "margot", "hotoniel", "jack", "sam", "robby", "margaret", "gigi",
    "christina", "emmy", "felipe", "florencia", "grey", "claire", "caroline", "hailey", "ryan", "jackson",
    "aj", "amara", "jon", "anaya", "patrick", "juliana", "nicholas", "finn", "connor", "andrew",
    "ella", "emma", "kate", "mary", "brendan", "joselyn", "mateo", "eliana", "graham", "nora",
    "will", "tuck", "amaree", "phillip", "maxx", "betsy", "sophie", "cole", "grant", "alexa",
    "sammy", "sidney-ann", "blair", "evelyn", "gracie", "ayokunle", "meriwether", "paige", "ria",
    "amelia", "hannah", "katlynn", "teagan", "beatrice", "sarah", "vance", "hunter", "brad", "tyler",
    "greg", "franklin", "braiden", "annabelle", "preston", "maddie", "tommy", "collier", "colt",
    "dean", "havana", "matthew", "lily", "kade", "griffin", "hayes", "mose", "vandy", "logan",
    "scarlett", "mcvey", "george", "chloe", "luke", "layla", "ryder", "ray", "victoria", "mayomi",
    "maya", "bryce", "sienna", "bobby", "charlie", "lilah", "sean", "kenzo", "leah", "jules",
    "gabriella", "charlotte", "sasha", "sophia", "tanner", "marley", "eva", "brent", "chase", "harley",
    "makayla", "grayson", "claire", "christian", "munchie", "nicole"
];

if (grade == null) {
    var GRADEWORDS = nogradeyet
} else if (grade == '"11"') {
    var GRADEWORDS = ELEVENTHGRADE
} else {
    var GRADEWORDS = nogradeyet
}

export const WORDS = GRADEWORDS;