import {
  GradeNumber,
  loadGradeFromLocalStorage,
  saveGradeToLocalStorage,
} from '../lib/localStorage'

const gradeStatKey = 'gradeNumber'
const grade = localStorage.getItem(gradeStatKey)
const nogradeyet = ['jack']


const EIGHTGRADE = [
  'leah', 'chase', 'avalina', 'moses', 'will', 'george', 'carter', 'mary', 'thomas', 'anna', 'olivia', 'preston', 'sophia', 'chase', 'avalina', 'graham', 'jackson', 'layla', 'sasha', 'maxx', 'ansley', 'grace', 'blair', 'knox', 'logan', 'brent', 'sarah', 'ryder', 'taylor', 'ryder', 'sophia', 'bryce', 'eliana', 'tyler', 'jack', 'daniel', 'connor', 'brooke', 'edmond', 'kenzo', 'sophia', 'paige', 'tucker', 'margot', 'jones', 'ella', 'marley', 'john', 'harley', 'emmy', 'nora', 'philip', 'john', 'kamran', 'hannah', 'gavin', 'sienna', 'tyson', 'teagan', 'daniel', 'claire', 'julian', 'mcvey', 'dean', 'avery', 'emma', 'claire', 'garret', 'ella', 'betsy', 'amara', 'colt', 'albert', 'amelia', 'audrey', 'kade', 'havana', 'hunter', 'emma', 'andrew', 'ajani', 'grant']


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