import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['error']

let GRADEWORDS = nogradeyet

const EIGHTGRADE = [
  'emerson', 'william', 'mitchell', 'rhodes', 'daniel', 'brooke',  
  'avery', 'harris', 'grant', 'madeline', 'cesar', 'gavin',  
  'davis', 'margot', 'hotoniel', 'jack', 'sam', 'robby',  
  'margaret', 'gigi', 'christina', 'emmy', 'felipe', 'florencia',  
  'grey', 'claire', 'caroline', 'hailey', 'ryan', 'jackson', 'aj',  
  'amara', 'jon', 'anaya', 'patrick', 'juliana', 'nicholas',  
  'finn', 'connor', 'andrew', 'ella', 'emma', 'kate', 'mary',  
  'brendan', 'joselyn', 'mateo', 'eliana', 'graham', 'nora',  
  'will', 'tuck', 'amaree', 'phillip', 'maxx', 'betsy',  
  'sophie', 'cole', 'grant', 'alexa', 'sammy', 'sidney-ann',  
  'blair', 'evelyn', 'gracie', 'ayokunle', 'meriwether',  
  'paige', 'ria', 'amelia', 'hannah', 'katlynn', 'teagan',  
  'beatrice', 'sarah', 'vance', 'hunter', 'brad', 'tyler',  
  'greg', 'franklin', 'braiden', 'annabelle', 'preston',  
  'maddie', 'tommy', 'collier', 'colt', 'dean', 'havana',  
  'matthew', 'lily', 'kade', 'griffin', 'hayes', 'mose',  
  'vandy', 'logan', 'scarlett', 'mcvey', 'george', 'chloe',  
  'luke', 'layla', 'ryder', 'ray', 'victoria', 'mayomi',  
  'maya', 'bryce', 'sienna', 'bobby', 'charlie', 'lilah',  
  'sean', 'kenzo', 'leah', 'jules', 'gabriella', 'charlotte',  
  'sasha', 'sophia', 'tanner', 'marley', 'eva', 'brent',  
  'chase', 'harley', 'makayla', 'grayson', 'claire',  
  'christian', 'munchie', 'nicole'
];

const SEVENGRADE = [
  'presley', 'liam', 'violet', 'sarah', 'grayden', 'lucy', 
  'cristiano', 'alexa', 'jake', 'lucas', 'prakhar', 'athena', 
  'ayden', 'william', 'sloane', 'perry', 'mia', 'tristen', 
  'davis', 'crosby', 'hugh', 'gailyn', 'sophia', 'jackson', 
  'logan', 'cathryn-rose', 'brayden', 'mary', 'isabel', 'sam', 
  'jack', 'ronan', 'isabella', 'elizabeth', 'lane', 'sovereign', 
  'caroline', 'samantha', 'joshua', 'laura', 'daniel', 'daniel', 
  'emma', 'ryan', 'ryan', 'turner', 'wyatt', 'connor', 'cole', 
  'julia', 'zoe', 'isabell', 'william', 'vivienne', 'emily', 
  'samuel', 'patrick', 'sara', 'peighton', 'jay', 'shane', 
  'emerson', 'hudson', 'colton', 'caroline', 'ryan', 'riley', 
  'edward', 'cole', 'addison', 'coleman', 'lucas', 'molly', 
  'tenzin', 'bennett', 'lydia', 'gemma', 'madison', 'keith', 
  'aubrey', 'strickland', 'mary', 'makenzie', 'chase', 'charles', 
  'eva', 'ingrid', 'robert', 'adair', 'bryce', 'henry', 
  'divyalakshmi', 'ellison', 'andrew', 'gaines', 'nicholas', 
  'landon', 'lucas', 'madeleine', 'ava', 'eden', 'treasure', 
  'merrick', 'xavier', 'madeline', 'jude', 'garrett', 'richard', 
  'joseph', 'whitney', 'william', 'bailey', 'thomas', 'bree', 
  'james', 'mary-grace', 'miller',
]

if (grade == null) {
  GRADEWORDS = nogradeyet
} else if (grade == '"69"') {
  console.log('nah thats crazy ')
} else if (grade == '"25"' || grade == '"8"') {
  GRADEWORDS = EIGHTGRADE
} else if (grade == '"7"') {
  GRADEWORDS = SEVENGRADE
} else {
  GRADEWORDS = nogradeyet
}

export const WORDS = GRADEWORDS
