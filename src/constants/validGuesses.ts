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
      'mary',
    'anna',
    'caroline',
    'marley',
    'will',
    'gerbi',
    'finn',
    'layla',
    'hannah',
    'margaret',
    'hayes',
    'lilly',
    'aj',
    'ryder',
    'daniel',
    'andrew',
    'dean',
    'carter',
    'john',
    'jackson',
    'william',
    'hunter',
'mitchell',
    'emmy',
    'grace',
    'andriana',
    'meriwether',
    'ray',
    'jack',
    'george',
    'harley',
    'sasha',
    'amara',
    'eva',
    'paige',
    'sophia',
    'braiden',
    'ella',
    'davis',
    'leah',
    'makayla',
    'caroline',
    'ryder',
    'grant',
    'scarlett',
    'chase',
    'christina',
    'connor',
    'maddie',
    'edmond',
    'graham',
    'olivia',
    'mcvey',
    'sophia',
    'alexa',
    'havana',
    'tyler',
    'taylor',
    'sienna',
    'lilliana',
    'betsy',
    'avery',
    'mose',
    'sam',
    'logan',
    'margot',
    'elizabeth',
    'knox',
    'nick',
    'sean',
    'annabelle',
    'ella',
    'tyson',
    'claire',
    'garrett',
    'ansley',
    'robbie',
    'kade',
    'sophie',
    'jones',
    'gavin',
    'tommy',
    'garret',
    'grayson',
    'grace',
    'sarah',
    'greyson',
    'ria',
    'camellia',
    'colt',
    'will',
    'daniel',
    'brent',
    'charlie',
    'maxx',
    'amelia',
    'claire',
    'avalina',
    'blair',
    'kattie',
    'preston',
    'kamran',
    'nora',
    'john',
    'franklin',
    'jon',
    'emma',
    'teagan',
    'bryce',
    'collier',
    'jules',
    'sophia',
    'eliana',
    'juliana',
    'nessa',
    'philip',
    'kenzo',
    'brooke',
    'emma',
    'beatrice',
    'tuck',
    'luke']


  const SEVENGRADE= ['andrew','madison','tristen','brayden','xavier','jake','joseph','madeline','mary','strickland','ingrid','jackson','zoe','bennett','nicholas','william','cole','bailey','tenzin','keith','ronan','lucas','eden','bree','eva','vivienne','liam','jack','lane','hudson','thomas','perry','ryan','edward','garrett','richard','gaines','wyatt','emma','bryce','henry','grayden','emily','samuel','william','laura','elizabeth','lydia','davis','jay','samantha','isabella','sloane','violet','sara','cathryn-rose','mary-grace','cristiano','whitney','addison','ellison','charles','isabel','peighton','isabell','mary','julia','ryan','crosby','gemma','sophia','daniel','hugh','alexa','merrick','landon','connor','robert','ayden','emerson','caroline','lucas','lucy','turner','joshua','coleman','chase','ava','prakhar','mia','sovereign','riley','daniel','james','cole','jude','sarah','madeleine','molly','shane','miller','presley','lucas','aubrey','caroline','gailyn','logan','makenzie','william','adair','athena','treasure','sam','colton','patrick','ryan','divyalakshmi']


if (grade == null){
  var GRADEWORDS = nogradeyet
}if(grade == '"69"'){
  console.log("nah thats crazy ")
}
if(grade == '"25"'){
  var GRADEWORDS = EIGHTGRADE
}if(grade == '"7"'){
  var GRADEWORDS = SEVENGRADE
}if(grade == '"8"'){
  var GRADEWORDS = EIGHTGRADE
}
else{
  var GRADEWORDS = nogradeyet
  
}
export const VALID_GUESSES = GRADEWORDS
