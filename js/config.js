/* =====================================================================
   TREELINE HUNT KIT — SETTINGS YOU CAN SAFELY CHANGE
   Files, in load order (see index.html):
   js/config.js ...... this file: species, score weights, form fields, tips, tours
   js/core.js ........ pure math: sun/moon, solunar, hunt score, ballistics
   js/util.js ........ small helpers, icons, default data
   js/data.js ........ saving, weather, factory ammo list
   js/draw.js ........ drawings: moon dial, turret, deer, map
   js/ui.js .......... pop-up sheets, help tips, tours, first-run setup
   js/screens/*.js ... one file per screen (tab)
   js/main.js ........ tab bar, page switching, start-up
   OLD OVERVIEW:
   1. CONFIG ........ knobs you can safely change: species, score weights,
                      form fields, help-tip wording, guided-tour steps
   2. CORE .......... pure math: sun/moon, solunar, hunt score, ballistics
   3. STORE ......... saving (your Claude account, else this phone)
   4. WEATHER ....... live forecast (Open-Meteo) with manual fallback
   5. DRAWINGS ...... moon dial, turret, target, scope view, deer
   6. SCREENS ....... one object per tab. Add a tab = add one object.
   ===================================================================== */

/* ---------- 1. CONFIG ---------- */
const CONFIG = {
  defaultLocation: {name:'Brandon, MS', lat:32.2732, lon:-89.9859},
  legalLightMin: 30,                    // minutes before sunrise / after sunset
  solunar: {majorMin:60, minorMin:30},  // half-width of each window (major = 2 h total)
  clicksPerTurn: 60,
  // Map styles. Free public sources, fine for personal use; switch to a paid provider if the app goes public.
  maps: {
    sat:   {label:'Satellite', url:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', opt:{maxZoom:19, attribution:'Imagery © Esri, Maxar, Earthstar Geographics'}},
    topo:  {label:'Topo',      url:'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', opt:{maxZoom:17, subdomains:'abc', attribution:'© OpenStreetMap contributors, SRTM · style © OpenTopoMap (CC-BY-SA)'}},
    street:{label:'Street',    url:'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opt:{maxZoom:19, attribution:'© OpenStreetMap contributors'}}
  },
  scentConeMeters: 250,
  // Reticles. unit + step = what one hash mark is worth. Add your own here.
  reticles: [
    {name:'Duplex (plain crosshair)'},
    {name:'MOA hash marks, 1 MOA apart', unit:'MOA', step:1},
    {name:'MOA hash marks, 2 MOA apart', unit:'MOA', step:2},
    {name:'MIL hash marks, 0.5 MIL apart', unit:'MIL', step:0.5},
    {name:'MIL hash marks, 1 MIL apart', unit:'MIL', step:1}
  ],
  fpsPerInch: 25,                       // velocity lost per inch of barrel shorter than the box's test barrel (rule of thumb)                    // only changes how the turret drawing spins
  // Each species = how much each factor matters (weights add to 1).
  species: {
    deer:   {label:'Whitetail deer', w:{light:.25,solunar:.20,pressure:.20,wind:.15,temp:.15,rain:.05}, windCurve:'calm'},
    turkey: {label:'Turkey',         w:{light:.35,solunar:.05,pressure:.10,wind:.25,temp:.05,rain:.20}, windCurve:'calm', morning:true},
    hogs:   {label:'Hogs',           w:{light:.30,solunar:.15,pressure:.15,wind:.15,temp:.20,rain:.05}, windCurve:'calm', night:true},
    ducks:  {label:'Ducks',          w:{light:.30,solunar:.05,pressure:.15,wind:.30,temp:.15,rain:.05}, windCurve:'windy'}
  },
  // Form fields. Add a line here and it shows up in the edit form automatically.
  // tip: the name of a help tip below, shown as a "?" button next to the field.
  rifleFields: [
    {k:'name',label:'Name',type:'text'},
    {k:'caliber',label:'Caliber',type:'text'},
    {k:'sightIn',label:'Scope height over bore (in)',type:'number',step:.05,tip:'sightIn'},
    {k:'clickUnit',label:'Turret unit',type:'select',opts:['MOA','MIL'],tip:'moa'},
    {k:'clickValue',label:'Value per click',type:'number',step:.025,tip:'clicks',help:'1/4 MOA = 0.25 · 1/8 MOA = 0.125 · 0.1 MIL = 0.1'},
    {k:'zeroYd',label:'Zero distance (yd)',type:'number',step:5,tip:'zero'},
    {k:'reticle',label:'Reticle',type:'select',get opts(){ return CONFIG.reticles.map(x=>x.name); },tip:'reticle'},
    {k:'barrelIn',label:'Barrel length (in)',type:'number',step:.5,tip:'barrel'},
    {k:'twist',label:'Barrel twist',type:'text'},
    {k:'notes',label:'Notes',type:'textarea'}
  ],
  loadFields: [
    {k:'name',label:'Name',type:'text'},
    {k:'kind',label:'Type',type:'select',opts:['Factory','Handload']},
    {k:'grains',label:'Bullet weight (gr)',type:'number',step:1},
    {k:'bc',label:'Ballistic coefficient (BC)',type:'number',step:.001,tip:'bc'},
    {k:'model',label:'BC type',type:'select',opts:['G1','G7'],help:'Use G1 unless the box says G7.'},
    {k:'bc7',label:'G7 BC (optional)',type:'number',step:.001,tip:'g7'},
    {k:'mv',label:'Box velocity (fps)',type:'number',step:5,tip:'mv'},
    {k:'testBarrel',label:'Box test-barrel length (in)',type:'number',step:.5,help:'Often printed near the velocity. 24 is common.'},
    {k:'mvChrono',label:'Chronograph velocity (fps), if you have it',type:'number',step:5,tip:'chrono'},
    {k:'powder',label:'Powder',type:'text',when:l=>l.kind==='Handload'},
    {k:'charge',label:'Charge (gr)',type:'text',when:l=>l.kind==='Handload',help:'Record only data from a published load manual.'},
    {k:'primer',label:'Primer',type:'text',when:l=>l.kind==='Handload'},
    {k:'coal',label:'Overall length (in)',type:'text',when:l=>l.kind==='Handload'},
    {k:'notes',label:'Notes',type:'textarea'}
  ]
};

/* Help tips: the "?" buttons. Edit the words freely. pic = which drawing to show. */
const TIPS = {
  score:{t:'Hunt score',b:'A 0–100 blend of light, solunar timing, barometer, wind, temperature trend and rain, weighted for the animal you picked. It comes from common hunting wisdom, not lab science.'},
  solunar:{t:'Solunar periods',b:'John Alden Knight\'s 1926 theory: animals move more when the moon is overhead or underfoot (major periods, about 2 hours) and when it rises or sets (minor, about 1 hour). The evidence is mixed, but a period that lands on dawn or dusk is worth planning around.',pic:'dial'},
  legal:{t:'Legal shooting light',b:'Most states allow shooting from about 30 minutes before sunrise to 30 minutes after sunset, but rules differ by state and species. Set yours in Setup and check your state\'s regulations.'},
  pressure:{t:'Barometer',b:'Many hunters see animals feed ahead of a falling barometer (a front coming in) and move again as it rises after the front passes.'},
  bc:{t:'Ballistic coefficient (BC)',b:'How well a bullet slips through the air. A higher number keeps its speed better and drops less. It\'s printed on most ammo boxes or the maker\'s website.',pic:'bc'},
  moa:{t:'MOA and MIL',b:'Two ways to measure small angles. 1 MOA is about 1 inch at 100 yards and 2 inches at 200. 1 MIL is 3.6 inches at 100 yards. Your turret caps say which your scope uses.',pic:'moa'},
  clicks:{t:'Turret clicks',b:'Each click moves where the bullet lands by a small, fixed amount, usually 1/4 MOA (about 1/4 inch at 100 yards). Turn toward the arrow marked UP to hit higher, or R to hit further right.',pic:'turret'},
  zero:{t:'Zero distance',b:'The distance where the bullet lands exactly on the crosshair. 100 yards is the most common deer-rifle zero.'},
  sightIn:{t:'Scope height',b:'From the center of the barrel to the center of the scope. Measure it, or use 1.5 inches for most hunting rifles.'},
  hold:{t:'Dial or hold',b:'Dial means turning the turret so the crosshair is dead-on at that distance. Hold means leaving the turret alone and aiming higher by the amount shown. When an animal is in front of you, holding is usually faster.'},
  mv:{t:'Muzzle velocity',b:'How fast the bullet leaves the barrel. The box number comes from a test barrel that may be longer than yours, so your real speed is often a bit lower. A chronograph tells you exactly.'},
  barrel:{t:'Barrel length',b:'A shorter barrel usually means a slower bullet than the box says. Treeline subtracts about 25 fps for every inch your barrel is shorter than the box\'s test barrel. That\'s a rule of thumb; truing or a chronograph beats it.'},
  chrono:{t:'Chronograph',b:'A chronograph measures your real bullet speed. If you enter it, Treeline uses it instead of the box number.'},
  truing:{t:'Truing',b:'Shoot at a long distance (200 to 300 yards), measure how far above or below the bullseye the group landed while aiming dead-on, and enter it. Treeline works backward to find the bullet speed that matches what really happened. This fixes every number in the app for that load.'},
  scent:{t:'Wind and scent',b:'Wind is named for where it comes from: a north wind blows from the north toward the south. Your scent drifts downwind, so a stand is good when animals usually approach from upwind of you.'},
  stand:{t:'Good winds',b:'Pick the wind directions that let you hunt this stand without your scent blowing toward where animals come from. Forecast then tells you which stand suits the day\'s wind.'},
  g7:{t:'G7 BC',b:'A second BC number, measured against a sleeker reference bullet. Long, boat-tail hunting and match bullets fly more like that shape, so G7 predicts drop and drift more accurately past about 300 yards. If a load has one, Treeline uses it automatically (you can turn that off in Setup).'},
  reticle:{t:'Reticle hash marks',b:'Many scopes have marks on the crosshair spaced a set amount apart, such as 2 MOA or 0.5 MIL; your scope manual says which. Pick yours and Treeline tells you which mark to put on the animal. On most scopes (second focal plane) the marks are only true at full power, so hold over at full power.'},
  mag:{t:'Scope power',b:'The scope view uses the field of view of a typical hunting scope at that power. Your scope may show slightly more or less.'}
};

/* Guided tours: shown the first time you open each tab. sel = the part to point at. */
const TOURS = {
  forecast:[{sel:'#verdict',text:'Start here. This is today\'s call: how good it looks, when to be in the stand, and the best two hours.'},
            {sel:'#stripcard',text:'Each bar is one hour. Taller is better. Brass bars are the best window. Tap any bar to see why it scored that way.'},
            {sel:'#dialcard',text:'The moon dial shows the whole day like a clock. Brass arcs are the solunar feeding periods; the lighter band is daylight.'}],
  locker:[{sel:'.card',text:'Your rifles live here. Each rifle holds its loads. The scope is sighted in with the load marked Zero load.'}],
  range:[{sel:'#scopecard',text:'Slide the distance and watch the deer move away. The crosshair shows where to aim so the bullet lands in the vitals.'},
         {sel:'#trajcard',text:'This is the bullet\'s path compared to your crosshair. Tap Fire to watch it fly.'}],
  zero:[{sel:'#tgtcard',text:'Shoot three shots, then tap where each one hit on this target. Your real target\'s grid matches the 1-inch squares.'},
        {sel:'#turrets',text:'Tap Show me and the turrets spin the exact number of clicks while the group slides onto the bullseye.'}],
  stands:[{sel:'#mapcard',text:'Your stands on the map. Press and hold anywhere (or line up the crosshair and tap Add stand) to drop a new one. Tap a pin to see its wind and scent cone.'},
          {sel:'#standlist',text:'Each stand shows its wind diagram: the arrow is the wind, the red cone is where your scent drifts, and the brass marks are the winds you picked as good.'}],
  journal:[{sel:'#logbtn',text:'Log every sit, even the empty ones. After a few, Treeline shows what conditions actually produce deer at your spots.'}],
  setup:[]
};
