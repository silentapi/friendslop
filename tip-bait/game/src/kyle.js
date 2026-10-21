// Everything Kyle S (and the courier) says. Text-speak, but always readable on a glance.
const pick = (a, r = Math.random) => a[Math.floor(r() * a.length) % a.length];
export const pickLine = pick;

// courier's thought when the order pings in, by how many times you've delivered to him
export function introThought(delivered, r) {
  if (delivered === 0) return pick(['new order. big tip. let’s gooo 🤑', 'a $50 tip?? for one coffee?? say less'], r);
  if (delivered === 1) return pick(['oh god. it’s kyle again.', 'wait. isn’t this the guy who took my tip?', 'kyle. again. floor 20. again.'], r);
  if (delivered < 4) return pick(['he’s never tipped. not once.', 'kyle needs his drink again. of course he does.', 'maybe this time he means it…', 'i swear if he changes the tip again'], r);
  return pick(['kyle has ordered this ' + (delivered + 1) + ' times. i have been tipped zero times.', 'at this point it’s personal.', 'one day kyle. one day.', 'kyle S. my nemesis. my only customer.'], r);
}
export const NOTES = [
  'iced caramel macchiato, extra caramel. $TIP tip if ur fast 🙏',
  'same order as always. $TIP tip this time fr fr',
  'need my coffee asap. tipping $TIP no cap',
  '$TIP tip on god. last time was a glitch',
  'im in a meeting in 10 min. $TIP if u make it',
  'grande iced caramel macchiato. tip is $TIP. dont be slow',
];
// texts during the ride, keyed by progress (0..1); one picked per run per slot
export const RIDE_TEXTS = [
  [0.07, ['hey where r u', 'did u pick it up yet?', 'is that u on the map? why r u so slow']],
  [0.3, ['i can see u on the map 👀', 'u went the wrong way i think', 'my zoom call starts soon fyi']],
  [0.55, ['my ice is gonna melt 😤', 'hurry its getting warm', 'is it still cold?? it better be cold']],
  [0.78, ['almost here? im starving', 'we hungry', 'ok i see u turning onto my street', 'pls hurry the tip is waiting 🙂']],
  [0.93, ['im on the 20th floor btw', 'front desk will let u in. maybe', 'elevator might be broken lol. good luck']],
];
export const LATE_TEXTS = ['bro ur late. tip going down 📉', 'we hungry', 'its been forever. lowering ur tip', 'why is this taking so long?? -$5', 'my coffee is probably warm now. tip lowered', 'tick tock 🙄 tip going down'];
export const CRASH_TEXTS = ['bro did u just fall off ur bike??', 'the app says ur not moving. what happened', 'pls tell me my drink is ok', 'i saw that on the map lol', 'u ok? more importantly is my coffee ok'];
export const FAST_TEXTS = ['ok ur actually fast 👀', 'wow ur making good time', 'nice. keep that energy'];
export const RAIL_TEXTS = ['the train is coming i can hear it from here 🚆', 'dont get stuck at the train tracks pls'];
export const STORM_TEXTS = ['its pouring 🌧 dont let it get watered down', 'rain is no excuse btw'];
export const LOBBY_TEXTS = ['just get the front desk to let u in', 'the front desk lady never looks up lol', 'why r u just standing there', 'wave or something idk'];
export const STAIRS_TEXTS = [
  [4, ['the elevator has been broken since march lol']],
  [10, ['hello?? halfway?', 'u coming or what']],
  [16, ['i can hear u breathing in the stairwell', 'almost there. dont spill it']],
];
export const DOOR_LINES = {
  soup: 'it’s literally soup',
  late: 'took u long enough',
  crashed: 'why does it look like u fell',
  fast: 'hm. ok. that was fast i guess',
  meh: 'kinda melted ngl',
};
export const THOUGHTS = {
  rail: ['the gates are coming down… ramp it.', 'do NOT stop for the train. kyle won’t care.'],
  bus: ['LYNX bus pulling out. classic.'],
  storm: ['of course it’s raining.'],
  tower: ['citi tower. floor 20. here we go again.'],
  locked: ['…locked. of course.'],
  elevator: ['out of order. again.'],
};
