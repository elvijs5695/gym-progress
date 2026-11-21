// Authored interface strings only. Exercise names and notes are resolved
// separately from their catalogue identity, never through this dictionary.
export const PRODUCTION_LV={
 'Edit':'Rediģēt','Create superset':'Izveidot supersetu','Separate superset':'Atdalīt supersetu',
 'No comparison points yet.':'Vēl nav salīdzināšanas datu.','No items yet.':'Vēl nav ierakstu.',
 'Suggested increase':'Ieteiktais palielinājums','Suggested increase:':'Ieteiktais palielinājums:',
 'Finish stretching':'Pabeigt stiepšanos','Skip':'Izlaist','Finish':'Pabeigt','Done':'Gatavs',
 'Timed':'Laika vingrinājums','timed':'laika vingrinājums','Bodyweight':'Ķermeņa svars',
 'barbell':'stienis','dumbbell':'hanteles','machine':'trenažieris','cable':'trošu trenažieris',
 'bodyweight':'ķermeņa svars','other':'cits','cardio':'kardio',
 'heavy compound':'smags daudzlocītavu','moderate compound':'vidējs daudzlocītavu',
 'machine compound':'daudzlocītavu trenažierī','isolation':'izolējošs',
 'Not enabled':'Nav ieslēgta','Up to date':'Sinhronizēts','Syncing…':'Sinhronizē…',
 'Pending changes':'Gaida sinhronizāciju','Offline':'Bezsaistē','Sync paused':'Sinhronizācija apturēta',
 'On · pace-aware daily reminders':'Ieslēgts · atgādinājumi atbilstoši dienas ritmam',
 'Off · pace-aware daily reminders':'Izslēgts · atgādinājumi atbilstoši dienas ritmam',
 'Uses qualifying Estimated 1-rep max (e1RM) sets.':'Izmanto atbilstošus aptuvenā viena atkārtojuma maksimuma (e1RM) piegājienus.',
 'estimates the maximum weight for one clean repetition from a qualifying working set. Only explicitly selected programme occurrences and exact matching catalogue exercises are compared.':'novērtē maksimālo svaru vienam tehniski pareizam atkārtojumam, izmantojot atbilstošu darba piegājienu. Salīdzina tikai īpaši izvēlētus programmas vingrinājumus un precīzi atbilstošus kataloga ierakstus.',
 'Finish as partial keeps completed work, marks every remaining set/exercise skipped, and shows this workout in Logs as Aborted. Discard workout removes this session completely and it will not appear in Logs or Progress.':'Daļēja pabeigšana saglabā paveikto, atzīmē atlikušos piegājienus un vingrinājumus kā izlaistus un žurnālā rāda treniņu kā pārtrauktu. Treniņa atmešana to pilnībā izdzēš no žurnāla un progresa.',
 'Catalogue names follow the interface language. Personal names are kept.':'Kataloga nosaukumi atbilst saskarnes valodai. Personīgie nosaukumi tiek saglabāti.',
 'Enter a valid email address.':'Ievadi derīgu e-pasta adresi.',
 'Enter the complete email code.':'Ievadi pilnu e-pasta kodu.',
 'Please wait before requesting another code.':'Pirms nākamā koda pieprasīšanas uzgaidi.',
 'Authentication returned an incomplete session. Please try again.':'Pieslēgšanās dati nav pilnīgi. Mēģini vēlreiz.',
 'The request timed out. Please retry.':'Pieprasījuma laiks ir beidzies. Mēģini vēlreiz.',
 'This workspace changed in another tab. Reload before editing.':'Dati ir mainījušies citā cilnē. Pirms rediģēšanas pārlādē šo cilni.',
 'Close another Gym Progress window to complete the storage update.':'Lai pabeigtu datu krātuves atjaunināšanu, aizver otru Gym Progress logu.',
 'Sign in to use your account.':'Lai izmantotu kontu, pieslēdzies.',
 'Account workspace is not connected.':'Konta darbvieta nav savienota.',
 'Account changed during the request':'Pieprasījuma laikā mainījās konts',
 'Account changed before deletion':'Pirms dzēšanas mainījās konts',
 'Workspace change in progress':'Notiek konta datu pārslēgšana',
 'Recovery':'Atkopšana','Download full backup':'Lejupielādēt pilnu rezerves kopiju',
 'Return to Gym Progress':'Atgriezties Gym Progress',
 'Opening this workspace…':'Atver darbvietu…',
 'The current workspace can be exported.':'Šo darbvietu var eksportēt.',
 'This workspace is empty.':'Šī darbvieta ir tukša.',
 'Earlier local data':'Iepriekšējie lokālie dati',
 'Export original app data':'Eksportēt sākotnējās lietotnes datus',
 'No original local data found.':'Sākotnējie lokālie dati nav atrasti.',
 'Original local data exported.':'Sākotnējie lokālie dati eksportēti.',
 'The original local database could not be read.':'Sākotnējo lokālo datubāzi neizdevās nolasīt.',
 'Database protocol 2 with a minimum client protocol of 2 or lower is required.':'Nepieciešama ar lietotnes 2. versiju saderīga datubāze.',
 'Current':'Pašreizējais','First':'Sākotnējais','Best set':'Labākais piegājiens',
 'History':'Vēsture','All days':'Visas dienas','Archived day':'Arhivēta diena',
 'Open exercise in workout':'Atvērt vingrinājumu treniņā',
 'Email code':'E-pasta kods','Change email':'Mainīt e-pastu','Resend code':'Nosūtīt kodu vēlreiz',
 'kg':'kg','RPE':'RPE','RIR':'RIR','RPE (1–10)':'RPE (1–10)',
};

const setReasons={
 'The set reached failure below the current load, rep and RIR target.':'Piegājienā sasniegta atteice, nesasniedzot pašreizējo svara, atkārtojumu un RIR mērķi.',
 'The set reached 0 RIR below the current load, rep and RIR target.':'Piegājienā sasniegts 0 RIR, nesasniedzot pašreizējo svara, atkārtojumu un RIR mērķi.',
 'The set finished below the current load, rep and RIR target.':'Piegājiens pabeigts, nesasniedzot pašreizējo svara, atkārtojumu un RIR mērķi.',
};
const nextAdvice={
 'Reducing the next rep target is optional.':'Nākamā piegājiena atkārtojumu mērķi vari samazināt.',
 'Keep the rep target and reduce the next load if needed.':'Saglabā atkārtojumu mērķi un, ja vajadzīgs, samazini nākamā piegājiena svaru.',
};
for(const [reason,translation] of Object.entries(setReasons))for(const [advice,text] of Object.entries(nextAdvice))PRODUCTION_LV[reason+' '+advice]=translation+' '+text;
const sessionReasons={
 'Several sets failed below the programmed target.':'Vairākos piegājienos sasniegta atteice pirms programmas mērķa.',
 'A set failed below the programmed target.':'Piegājienā sasniegta atteice pirms programmas mērķa.',
};
const sessionAdvice={
 'A small rep-target reduction next time is optional.':'Nākamreiz atkārtojumu mērķi vari nedaudz samazināt.',
 'A small working-weight reduction next time is optional.':'Nākamreiz darba svaru vari nedaudz samazināt.',
};
for(const [reason,translation] of Object.entries(sessionReasons))for(const [advice,text] of Object.entries(sessionAdvice))PRODUCTION_LV[reason+' '+advice]=translation+' '+text;
