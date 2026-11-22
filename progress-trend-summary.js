/** A single observational sentence, based on existing individualised workout-analysis thresholds.
 * Not a diagnostic test; insufficient history is never labelled plateau.
 */
export function compactProgressTrend({mode='strength',visibleCount=0,assessment=null}={}){
 const calibrate={tone:'neutral',en:'Calibrating · record more comparable sessions to identify a personal trend.',lv:'Kalibrēšana · personiskai tendencei vajadzīgi vairāk salīdzināmu treniņu.'};
 if(visibleCount<2||mode==='cardio')return mode==='cardio'
  ?{tone:'neutral',en:'Cardio trend · compare similar efforts; pace alone is not a fitness diagnosis.',lv:'Kardio tendence · salīdzini līdzīgu piepūli; temps viens pats nenosaka sagatavotību.'}
  :calibrate;
 if(!assessment||assessment.state==='CALIBRATING'||assessment.confidence==='LOW')return calibrate;
 const phrases={
  RAPID_ADAPTATION:{tone:'good',en:'Progressing · recent accepted load increases are frequent.',lv:'Progressē · pēdējos treniņos bieži pieņemts lielāks darba svars.'},
  ON_TRACK:{tone:'good',en:'On track · results follow your recent personal pattern.',lv:'Atbilstoši · rezultāti atbilst tavam nesenajam ritmam.'},
  PROGRESSION_APPROACHING:{tone:'good',en:'Progression possible · review the next prescribed increase.',lv:'Iespējams progress · pārskati nākamo piedāvāto slodzes kāpumu.'},
  SLOWING:{tone:'neutral',en:'Slower progression · compare more sessions before changing load.',lv:'Lēnāks progress · pirms slodzes maiņas salīdzini vairāk treniņu.'},
  STALLED:{tone:'attention',en:'Possible plateau · progression is slower than your personal baseline.',lv:'Iespējams plato · progress atpaliek no tava ierastā ritma.'},
  DECLINING:{tone:'attention',en:'Recent performance decline · consider fatigue and recovery context.',lv:'Nesen pazemināta veiktspēja · izvērtē nogurumu un atjaunošanos.'}
 };
 return phrases[assessment.state]||calibrate;
}
