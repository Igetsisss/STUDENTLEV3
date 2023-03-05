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
  'leah', 'chase', 'avalina', 'moses', 'will', 'george', 'carter', 'mary', 'thomas', 'anna', 'olivia', 'preston', 'sophia', 'chase', 'avalina', 'graham', 'jackson', 'layla', 'sasha', 'maxx', 'ansley', 'grace', 'blair', 'knox', 'logan', 'brent', 'sarah', 'ryder', 'taylor', 'ryder', 'sophia', 'bryce', 'eliana', 'tyler', 'jack', 'daniel', 'connor', 'brooke', 'edmond', 'kenzo', 'sophia', 'paige', 'tucker', 'margot', 'jones', 'ella', 'marley', 'john', 'harley', 'emmy', 'nora', 'philip', 'john', 'kamran', 'hannah', 'gavin', 'sienna', 'tyson', 'teagan', 'daniel', 'claire', 'julian', 'mcvey', 'dean', 'avery', 'emma', 'claire', 'garret', 'ella', 'betsy', 'amara', 'colt', 'albert', 'amelia', 'audrey', 'kade', 'havana', 'hunter', 'emma', 'andrew', 'ajani', 'grant']


const SEVENGRADE= ['presley','liam','violet','sarah','grayden','lucy','cristiano','alexa','jake','lucas','prakhar','athena','ayden','william','sloane','perry','mia','tristen','davis','crosby','hugh','gailyn','sophia','jackson','logan','cathryn-rose','brayden','mary','isabel','sam','jack','ronan','isabella','elizabeth','lane','sovereign','caroline','samantha','joshua','laura','daniel','daniel','emma','ryan','ryan','turner','wyatt','connor','cole','julia','zoe','isabell','william','vivienne','emily','samuel','patrick','sara','peighton','jay','shane','emerson','hudson','colton','caroline','ryan','riley','edward','cole','addison','coleman','lucas','molly','tenzin','bennett','lydia','gemma','madison','keith','aubrey','strickland','mary','makenzie','chase','charles','eva','ingrid','robert','adair','bryce','henry','divyalakshmi','ellison','andrew','gaines','nicholas','landon','lucas','madeleine','ava','eden','treasure','merrick','xavier','madeline','jude','garrett','richard','joseph','whitney','william','bailey','thomas','bree','james','mary-grace','miller']


if (grade == null){
  var GRADEWORDS = nogradeyet
} else if(grade == '"69"'){
  console.log("nah thats crazy ")
} else if(grade == '"25"'){
  var GRADEWORDS = EIGHTGRADE
} else if(grade == '"7"'){
  var GRADEWORDS = SEVENGRADE
}else if(grade == '"8"'){
  var GRADEWORDS = EIGHTGRADE
} else{
  var GRADEWORDS = nogradeyet
  
}
export const WORDS = GRADEWORDS