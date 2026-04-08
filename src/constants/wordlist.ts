import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['error']

let GRADEWORDS = nogradeyet

const SENIOR = [
  'chase', 'ryan', 'rania', 'matthew', 'jb', 'henry', 'claire', 'marshall', 
  'addie', 'arden', 'sophie', 'james', 'blair', 'kennedy', 'alex', 'ben', 
  'charlie', 'ollie', 'callie', 'beckett', 'vivian', 'gavin', 'sarah', 'mac', 
  'taylor', 'ethan', 'kate', 'ella', 'peyton', 'jack', 'grant', 'gabe', 'lily', 
  'brady', 'devin', 'sam', 'myles', 'carson', 'fallon', 'baxter', 'mary frances', 
  'maddie', 'grace', 'julie', 'lila', 'jordan', 'parker', 'jay', 'andrew', 
  'caroline', 'nate', 'haylen', 'mary kathryn', 'sophia', 'marcos', 'sairis', 
  'alexa', 'zari', 'evie', 'jada', 'olivia', 'katherine', 'keval', 'jordynn', 
  'lewis', 'tommy', 'steele', 'dallas', 'austin', 'lilly', 'zion', 'rio', 
  'will', 'evan', 'cate', 'xavier', 'miller', 'anna', 'fletcher', 'khalid'
]

const JUNIOR = [
  'emerson', 'william', 'mitchell', 'rhodes', 'daniel', 'brooke', 'avery',
  'harris', 'grant', 'madeline', 'cesar', 'gavin', 'davis', 'margot',
  'hotoniel', 'jack', 'sam', 'robby', 'margaret', 'gigi', 'christina',
  'emmy', 'felipe', 'florencia', 'grey', 'claire', 'caroline', 'hailey',
  'ryan', 'jackson', 'aj', 'amara', 'jon', 'anaya', 'patrick', 'juliana',
  'nick', 'finn', 'connor', 'andrew', 'ella', 'emma', 'kate', 'mary',
  'brendan', 'joselyn', 'mateo', 'eliana', 'graham', 'nora', 'will',
  'tuck', 'amaree', 'phillip', 'maxx', 'betsy', 'sophie', 'cole', 'alexa',
  'sammy', 'blair', 'evelyn', 'gracie', 'ayo', 'meriwether', 'paige',
  'ria', 'amelia', 'hannah', 'katlynn', 'teagan', 'beatrice', 'sarah',
  'vance', 'hunter', 'brad', 'tyler', 'greg', 'franklin', 'braiden',
  'annabelle', 'preston', 'maddie', 'tommy', 'collier', 'colt', 'dean',
  'havana', 'matthew', 'lily', 'kade', 'griffin', 'hayes', 'mose', 'vandy',
  'logan', 'scarlett', 'mcvey', 'george', 'chloe', 'luke', 'layla',
  'ryder', 'ray', 'victoria', 'mayomi', 'maya', 'bryce', 'sienna', 'bobby',
  'charlie', 'lilah', 'sean', 'kenzo', 'leah', 'jules', 'gabby',
  'charlotte', 'sasha', 'sophia', 'tanner', 'marley', 'eva', 'brent',
  'chase', 'harley', 'makayla', 'grayson', 'chris', 'munchie', 'nicole'
]

const SOPHOMORE = [
  'madison', 'brayden', 'quinn', 'strickland', 'will', 'cole', 'bailey', 
  'fisher', 'ronan', 'bentley', 'mackenzie', 'liam', 'garrett', 'brody', 
  'dyer', 'marshall', 'grayden', 'emily', 'sam', 'jackie', 'lila', 
  'elizabeth', 'teddy', 'violet', 'sky', 'bella', 'sloane', 'martin', 
  'landen', 'cooper', 'cathryn-rose', 'mary-grace', 'whitney', 'ellison', 
  'charlie', 'mary brooks', 'julia-pun', 'addison', 'crosby', 'townsend', 
  'belle', 'alexa', 'merrick', 'amaya', 'jackson', 'bobby', 'maia', 'emme', 
  'caroline', 'turner', 'ava', 'mia', 'kaylee', 'logan', 'maddie', 'molly', 
  'shane', 'gabby', 'bryson', 'allison', 'daniel', 'wilkins', 'treasure', 
  'ashley', 'colt', 'divya'
]

const FRESHMAN = [
  'king', 'ben', 'graham', 'aaron', 'morgan', 'finn', 'amzie', 'cole', 
  'natalie', 'blakely', 'jacob', 'henry', 'kate', 'robert', 'chris', 
  'byrdie', 'fiver', 'sam', 'zachery', 'ken ken', 'ryan', 'sawyer', 
  'hudson', 'cannon', 'addie', 'harrison', 'mimi', 'liam', 'gus', 'banks', 
  'hardy', 'matthew', 'alessandra', 'yovela', 'asher', 'joey', 'nandi', 
  'ellie', 'ridge', 'temma', 'ollie', 'katie', 'colin', 'ellison', 'parks', 
  'joe', 'nicholas', 'jake', 'trey', 'xavi', 'jaiden', 'lila', 'samantha', 
  'kaleb', 'penny', 'bates', 'miller', 'jack', 'eve', 'gracie', 'callan', 
  'sanders', 'catherine', 'aidan', 'mark', 'abe', 'chelsea', 'parker', 
  'camille', 'christian', 'isabelle', 'kennedy', 'alice', 'ava', 'haiden', 
  'mack', 'bobby', 'xavier', 'liza', 'hattie', 'bella', 'mary drew'
]

if (grade == null) {
  GRADEWORDS = JUNIOR // Updated to match previous default behavior
} else if (grade == '"69"') {
  console.log('nah thats crazy ')
} else if (grade == '"12"' || grade == '"26"') {
  GRADEWORDS = SENIOR
} else if (grade == '"11"' || grade == '"27"' || grade == '"8"') { // Keeping 8 mapped to Juniors
  GRADEWORDS = JUNIOR
} else if (grade == '"10"' || grade == '"28"' || grade == '"7"') { // Keeping 7 mapped to Sophomores for backward compatibility
  GRADEWORDS = SOPHOMORE
} else if (grade == '"9"' || grade == '"29"') {
  GRADEWORDS = FRESHMAN
} else {
  GRADEWORDS = nogradeyet
}

export const WORDS = GRADEWORDS
