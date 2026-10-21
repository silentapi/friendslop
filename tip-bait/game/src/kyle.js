import { rnd } from './core.js';
// Everything Kyle S (and the courier) says. Text-speak, but always readable on a glance.
const pick = (a, r = () => rnd('lines')) => a[Math.floor(r() * a.length) % a.length];
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
// what Kyle says at the door: always an excuse to report it. A situational jab when he's got one, otherwise the
// refund-hunting classics (it's never cold enough, never right, never his fault)
export const DOOR_LINES = {
  soup: ['it’s literally soup', 'this is coffee-flavored water', 'i ordered ICED. this is lukewarm', 'the ice is gone. like gone gone', 'this is a hot beverage now. reporting'],
  late: ['took u long enough', 'my zoom already started bro', 'i aged a year waiting', 'the app said 10 min. the app lied. u lied'],
  crashed: ['why does it look like u fell', 'the lid is dented. that’s a refund', 'why is the cup sticky', 'it’s shaken. i didn’t order it shaken'],
  fast: ['suspiciously fast. did u even go to starbucks', 'ok fast but the foam is flat', 'too fast. it didn’t have time to get cold'],
  scam: ['kinda melted ngl', 'this feels warm. is it warm? it’s warm', 'hm. the ice looks tired', 'where’s my extra caramel drizzle', 'i said oat milk. this tastes like oat milk', 'there’s condensation on the cup. that’s a spill', 'the straw wrapper is ripped. need a refund', 'this is 40% ice. i’m being scammed', 'it’s cold but not COLD cold', 'the bag smells like bike', 'did u breathe on it', 'hold it up for a pic. for the refund', 'the vibes are off. reporting'],
};
let lastDoor = '';
export function doorLine({ ice = 100, late = false, crashes = 0, fast = false, extra = null } = {}) {
  const sit = [...(ice < 25 ? DOOR_LINES.soup : []), ...(late ? DOOR_LINES.late : []), ...(crashes >= 2 ? DOOR_LINES.crashed : []), ...(fast ? DOOR_LINES.fast : []), ...(extra || [])];
  let line;
  for (let k = 0; k < 6 && (!line || line === lastDoor); k++) { const pool = sit.length && rnd('lines') < 0.6 ? sit : DOOR_LINES.scam; line = pool[Math.floor(rnd('lines') * pool.length)]; }
  return (lastDoor = line);
}
export const THOUGHTS = {
  rail: ['the gates are coming down… ramp it.', 'do NOT stop for the train. kyle won’t care.'],
  bus: ['LYNX bus pulling out. classic.'],
  storm: ['of course it’s raining.'],
  tower: ['citi tower. floor 20. here we go again.'],
  locked: ['…locked. of course.'],
  elevator: ['out of order. again.'],
};
