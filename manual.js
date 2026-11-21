const EN=[
  [
    "Start & programme",
    "Use the three-day starter wizard or create your own workout days. The programme editor requires a positive working weight for loaded exercises. If a starter exercise has no known load, the workout asks you to choose one before beginning. Barbell weight is the total bar weight; dumbbell weight is one dumbbell, with Pair counting both in volume. Bodyweight exercises use repetitions. Manual decimal weights are kept exactly. Use the up/down controls or drag grip to reorder; a focused grip also supports Alt + Up/Down. Programme edits do not rewrite recorded workouts."
  ],
  [
    "Workout flow",
    "Warm-up → exercise preparation → optional ramp-up → working sets and rest → optional unload → stretching. Before an exercise you can begin, move it later, replace it or skip it. Rest continues while choosing the next exercise. The thin progress line follows the current work and rest phases; a superset counts as one exercise stage. Back returns to navigation without undoing a result. Undo and Redo explicitly change the last saved set."
  ],
  [
    "Saving a set: RIR and Failure",
    "Press SET COMPLETE to start rest and enter the result. Count only fully completed repetitions. RIR means how many additional good repetitions you believe were possible. Choose a numeric RIR or Failure before saving. Failure means another attempted repetition could not be completed; that attempted repetition is not counted. Rest finishing does not save or discard unfinished input. Cancelling entry returns to the unsaved set."
  ],
  [
    "Timed exercise and cardio: RPE",
    "Start the timer, then finish the activity when you stop. Cardio result entry freezes the recorded duration. Resume timer continues from that duration and excludes time spent entering data. Distance, average heart rate, power and RPE are optional: N/A leaves a measurement unknown; a recorded zero distance stays zero. Cardio RPE is overall perceived effort on a 1–10 scale, separate from strength RIR. Duration × RPE is recorded training load, not a fitness score. Pace or power comparisons use similar recorded effort and activity conditions, and do not establish why a result changed."
  ],
  [
    "PROGRESS / HOLD / REDUCE",
    "These are optional recommendations for the next target. PROGRESS means the completed working sets support an increase. HOLD means keeping the current target. REDUCE means a lower load or target may be worth considering from the recorded results. Repetitions, RIR/Failure and the programmed target inform the recommendation. You can accept, edit or decline it. Declining an increase is recorded separately and is not itself evidence of physiological stagnation."
  ],
  [
    "Exercise trends",
    "A trend describes recent exposures against your own recorded pattern. Calibrating means there is too little history for a firm comparison. Rapid progression means increases are arriving unusually quickly. On track means the result is consistent with the recent pattern. Progression approaching means performance is improving and an increase may be near. Slower than usual, Stalled and Declining describe slower progress, a sustained plateau or a decline respectively. Not assessed means no supported interpretation is available. These are interpretations of training records, not diagnoses or predictions of potential."
  ],
  [
    "Workout-wide pattern",
    "Insufficient data means there are not enough complete, rated strength records to assess a broad pattern. Normal means no broad decline was detected in the recorded strength data; it does not establish readiness to train. Watch describes one workout below the recent pattern. Fatigue suspected and Deload candidate describe broader or more persistent decline and may prompt consideration of recovery or a lighter session. These labels do not determine the cause or automatically change your training."
  ],
  [
    "Logs & Progress",
    "Finish as partial keeps completed work and marks the session Aborted. Discard workout removes that active session. Fully completed exercises from a partial session can appear in Progress; incomplete exercises do not. Logs retains the recorded details, including skipped sets and notes. Progress separates strength, timed and cardio measurements. e1RM is an estimated one-repetition maximum, not a measured maximal attempt. All occurrences combines the strongest metric result at each exposure index; Measurements & sources identifies the recorded workout behind each displayed metric."
  ],
  [
    "Own Rhythm & Shared Rhythm",
    "Own Rhythm in Logs shows when your recorded workouts took place. Drag to move through time and pinch to change the range; select a workout at a detailed scale to open its record. Shared Rhythm in Friends shows the activity available through your friendships, with a row for each person. It does not expose your private programme or Tracker. The surrounding session lists remain useful when you need exact dates and details."
  ],
  [
    "Names and catalogue identity",
    "An exercise name you create stays as entered when the interface language changes. A catalogue link provides a stable exercise identity across languages. Choose or change that link deliberately when you want exact catalogue comparison; unlinking keeps the local exercise. Friend comparison uses eligible matching catalogue exercises and your selected programme occurrences. It does not compare movements merely because their names are similar."
  ],
  [
    "Account, sync & sharing",
    "Guest training and each account use separate local workspaces. Signing out returns to Guest and retains the account workspace. Review which private domains to sync: Programme, Workout history and Tracker. Check conflict choices before choosing the local or cloud version. Friends uses the account, but private sync does not publish training to friends. After finishing a workout, nothing is shared automatically: select the summary cards, optionally add a comment, then publish the selection."
  ],
  [
    "Backup, restore & deletion",
    "Full backup creates the v2 restorable JSON for the current workspace, including programme, history, settings, Tracker and any active workout draft. Restore shows a preview; keep the original backup file. CSV and detailed JSON are analysis exports, not substitutes for Full backup. Recovery copies on this device help with a local mistake but are not a separate copy if the device is lost. Erase exercise log data, Erase all training data and Delete account have different scopes: read the final confirmation and save a backup first if needed. Cloud deletion is attempted before its corresponding local erasure; a failed step is reported."
  ],
  [
    "Tracker, appearance & reminders",
    "Tracker has one current total per item. Unitless items increase by one; items with units use the configured increment. The productive-day marker follows the configured hours, and an item becomes behind only after a due checkpoint. At the next local day, the current total resets and the prior saved value is retained in the backup data. Theme can be Light, Dark or System and stays on this device. Sound, keep-awake and reminders are optional. Browser notifications require permission, and delivery can depend on the browser and device."
  ]
];

const LV=[
  [
    "Sākšana un programma",
    "Izmanto trīs dienu sākuma vedni vai izveido savas treniņu dienas. Programmas redaktors vingrinājumiem ar ārēju slodzi prasa pozitīvu darba svaru. Ja sākuma programmā svars nav zināms, pirms vingrinājuma sākšanas lietotne lūdz to izvēlēties. Stienim ievadi kopējo stieņa svaru; hantelēm — vienas hanteles svaru, un režīms Pāris apjomā ieskaita abas. Ķermeņa svara vingrinājumos mērķis ir atkārtojumi. Manuāli ievadīti decimālie svari tiek saglabāti precīzi. Secību maini ar augšup/lejup pogām vai velkot aiz roktura; fokusētam rokturim darbojas arī Alt + bulta augšup/lejup. Programmas labojumi nepārraksta reģistrētus treniņus."
  ],
  [
    "Treniņa plūsma",
    "Iesildīšanās → sagatavošanās vingrinājumam → pēc izvēles iesildīšanās piegājieni → darba piegājieni un atpūta → pēc vajadzības svaru noņemšana → stiepšanās. Pirms vingrinājuma vari to sākt, atlikt, aizstāt vai izlaist. Atpūta turpinās, kamēr izvēlies nākamo vingrinājumu. Plānā progresa josla seko darba un atpūtas posmiem; supersets skaitās viens vingrinājuma posms. Atpakaļ atgriež navigācijā un neatsauc rezultātu. Atsaukt un Atkārtot ir atsevišķas darbības pēdējā saglabātā piegājiena labošanai."
  ],
  [
    "Piegājiena saglabāšana: RIR un Atteice",
    "Nospied PIEGĀJIENS PABEIGTS, lai sāktu atpūtu un ievadītu rezultātu. Uzskaiti tikai pilnībā pabeigtus atkārtojumus. RIR ir atkārtojumu rezerve — cik kvalitatīvus atkārtojumus vēl būtu iespējams izpildīt. Pirms saglabāšanas izvēlies RIR skaitli vai Atteici. Atteice nozīmē, ka mēģināji vēl vienu atkārtojumu, bet to nevarēji pabeigt; šis mēģinājums netiek ieskaitīts. Atpūtas beigšanās nesaglabā un neizdzēš nepabeigtu ievadi. Atceļot ievadi, atgriezies pie vēl nesaglabāta piegājiena."
  ],
  [
    "Laika vingrinājumi un kardio: RPE",
    "Sāc taimeri un pabeidz aktivitāti, kad apstājies. Kardio rezultātu ievade fiksē reģistrēto ilgumu. Atsākt taimeri turpina no šī ilguma, neieskaitot rezultātu ievades laiku. Distance, vidējais pulss, jauda un RPE nav obligāti: N/A atstāj mērījumu nezināmu, bet ievadīta nulles distance paliek nulle. Kardio RPE ir kopējā uztvertā piepūle skalā no 1 līdz 10; tā ir atsevišķa no spēka vingrinājumu RIR. Ilgums × RPE ir reģistrētā treniņa slodze, nevis fiziskās sagatavotības rādītājs. Tempu un jaudu salīdzina pie līdzīgas reģistrētās piepūles un aktivitātes apstākļiem; salīdzinājums nenosaka izmaiņu cēloni."
  ],
  [
    "PALIELINĀT / SAGLABĀT / SAMAZINĀT",
    "Tie ir izvēles ieteikumi nākamajam mērķim. PALIELINĀT nozīmē, ka pabeigtie darba piegājieni atbalsta palielinājumu. SAGLABĀT nozīmē atstāt pašreizējo mērķi. SAMAZINĀT nozīmē, ka no reģistrētajiem rezultātiem var apsvērt mazāku svaru vai mērķi. Ieteikumu veido atkārtojumi, RIR/atteice un ieprogrammētais mērķis. Vari to pieņemt, rediģēt vai noraidīt. Palielinājuma noraidīšana tiek reģistrēta atsevišķi un pati par sevi neliecina par fizioloģisku stagnāciju."
  ],
  [
    "Vingrinājuma tendences",
    "Tendence salīdzina nesenās izpildes ar tavu paša reģistrēto rakstu. Kalibrēšana nozīmē, ka vēstures vēl ir par maz drošam salīdzinājumam. Straujš progress nozīmē neparasti biežus pieaugumus. Atbilstoši ierastajam nozīmē, ka rezultāts atbilst nesenajam rakstam. Tuvojas mērķa palielināšana nozīmē, ka sniegums uzlabojas un palielinājums var būt tuvu. Lēnāk nekā ierasts, Bez progresa un Pasliktināšanās attiecīgi apraksta lēnāku progresu, ilgstošu plato vai kritumu. Nav novērtēts nozīmē, ka pamatots secinājums nav pieejams. Tie ir treniņu ierakstu skaidrojumi, nevis diagnozes vai tava potenciāla prognozes."
  ],
  [
    "Kopējais treniņa raksts",
    "NEPIETIEK DATU nozīmē, ka nav pietiekami daudz pilnīgu spēka treniņu ierakstu ar norādītu piepūli, lai novērtētu plašāku rakstu. NAV PLAŠA KRITUMA nozīmē, ka reģistrētajos spēka datos nav konstatēta plaša pasliktināšanās; tas neapstiprina gatavību treniņam. NOVĒROT apraksta vienu treniņu zem nesen ierastā. IESPĒJAMS NOGURUMS un APSVĒRT VIEGLĀKU TRENIŅU apraksta plašāku vai ilgstošāku kritumu un var rosināt apsvērt atjaunošanos vai vieglāku treniņu. Šie apzīmējumi nenosaka cēloni un automātiski nemaina treniņu."
  ],
  [
    "Žurnāls un Progress",
    "Pabeigt kā nepilnu saglabā paveikto un atzīmē treniņu kā Pārtrauktu. Atmest treniņu dzēš aktīvo sesiju. Pilnībā pabeigti vingrinājumi no nepilna treniņa var parādīties Progresā; nepabeigtie netiek izmantoti. Žurnāls saglabā reģistrētās detaļas, arī izlaistos piegājienus un piezīmes. Progress nodala spēka, laika un kardio mērījumus. e1RM ir aprēķināts viena atkārtojuma maksimums, nevis faktiski izmēģināts maksimālais svars. Visi programmas ieraksti katrā izpildes indeksā apvieno katra rādītāja lielāko vērtību; Mērījumi un avoti norāda treniņu, no kura nāk konkrētais rādītājs."
  ],
  [
    "Mans ritms un Kopīgais ritms",
    "Mans ritms Žurnālā rāda, kad notikuši reģistrētie treniņi. Velc, lai pārvietotos laikā, un savelc vai izplet, lai mainītu diapazonu; detalizētā mērogā izvēlies treniņu, lai atvērtu tā ierakstu. Kopīgais ritms sadaļā Draugi rāda draudzībās pieejamo aktivitāti, katrai personai atsevišķā rindā. Tas neatklāj privāto programmu vai Tracker. Blakus esošie treniņu saraksti noder precīzu datumu un detaļu apskatei."
  ],
  [
    "Nosaukumi un kataloga identitāte",
    "Paša izveidots vingrinājuma nosaukums paliek ievadītajā valodā, arī mainot saskarnes valodu. Kataloga saite nodrošina stabilu vingrinājuma identitāti dažādās valodās. Izvēlies vai maini saiti apzināti, ja vēlies precīzu kataloga salīdzinājumu; atvienošana saglabā lokālo vingrinājumu. Salīdzināšana ar draugiem izmanto atbilstošus vienādus kataloga vingrinājumus un tavus izvēlētos programmas ierakstus. Līdzīgi nosaukumi vien nenozīmē, ka kustības ir salīdzināmas."
  ],
  [
    "Konts, sinhronizācija un kopīgošana",
    "Viesa treniņiem un katram kontam ir atsevišķa lokālā darbvieta. Izrakstīšanās atgriež Viesa režīmā un saglabā konta darbvietu. Pārskati, kuras privātās jomas sinhronizēt: Programmu, Treniņu vēsturi un Tracker. Pirms lokālās vai mākoņa versijas izvēles pārskati konfliktu. Draugi izmanto kontu, taču privāta sinhronizācija nepublicē treniņus draugiem. Pēc treniņa nekas netiek kopīgots automātiski: izvēlies kopsavilkuma kartītes, pēc vēlēšanās pievieno komentāru un publicē izvēlēto."
  ],
  [
    "Rezerves kopija, atjaunošana un dzēšana",
    "Pilna rezerves kopija izveido pašreizējās darbvietas atjaunojamu v2 JSON ar programmu, vēsturi, iestatījumiem, Tracker un aktīvā treniņa melnrakstu, ja tāds ir. Pirms atjaunošanas tiek parādīts priekšskatījums; saglabā sākotnējo kopijas failu. CSV un detalizētais JSON ir analīzes eksports un neaizstāj Pilnu rezerves kopiju. Atkopšanas kopijas šajā ierīcē palīdz pēc lokālas kļūdas, taču nav atsevišķa kopija ierīces nozaudēšanas gadījumam. Dzēst vingrinājumu žurnāla datus, Dzēst visus treniņu datus un Dzēst kontu aptver atšķirīgus datus: izlasi pēdējo apstiprinājumu un vajadzības gadījumā vispirms saglabā kopiju. Attiecīgo mākoņa datu dzēšana notiek pirms lokālās dzēšanas; neveiksmīgs solis tiek paziņots."
  ],
  [
    "Tracker, izskats un atgādinājumi",
    "Katram Tracker ierakstam ir viens pašreizējais daudzums. Ieraksti bez mērvienības palielinās par vienu; ieraksti ar mērvienību izmanto iestatīto soli. Aktīvās dienas atzīme seko iestatītajām stundām, un ieraksts atpaliek tikai pēc pienākuša kontrolpunkta. Nākamajā vietējā dienā pašreizējais daudzums sākas no jauna, bet iepriekš saglabātā vērtība paliek rezerves kopijas datos. Izskats var būt Gaišs, Tumšs vai Sistēmas un paliek šajā ierīcē. Skaņa, ieslēgts ekrāns un atgādinājumi nav obligāti. Pārlūka paziņojumiem vajadzīga atļauja; piegāde var būt atkarīga no pārlūka un ierīces."
  ]
];

export function manualHtml(lang='en'){
  const items=lang==='lv'?LV:EN;
  return `<div class="manual-guide">`+
    items.map(([heading,body],i)=>`<section class="manual-section"><div class="manual-section-head"><span class="manual-number">${String(i+1).padStart(2,'0')}</span><h2>${heading}</h2></div><p>${body}</p></section>`).join('')+
    `</div>`;
}
