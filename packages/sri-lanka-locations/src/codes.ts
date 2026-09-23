/** ISO 3166-2:LK province codes. Keys match `sl-gnd-dsd-districts` English names. */
export const PROVINCE_ISO: Record<string, string> = {
  Western: 'LK-1',
  Central: 'LK-2',
  Southern: 'LK-3',
  Northern: 'LK-4',
  Eastern: 'LK-5',
  'North-Western': 'LK-6',
  'North-Central': 'LK-7',
  Uva: 'LK-8',
  Sabaragamuwa: 'LK-9',
};

/** ISO 3166-2:LK district codes. Keys match `sl-gnd-dsd-districts` English names. */
export const DISTRICT_ISO: Record<string, string> = {
  Colombo: 'LK-11',
  Gampaha: 'LK-12',
  Kalutara: 'LK-13',
  Kandy: 'LK-21',
  Matale: 'LK-22',
  'Nuwara Eliya': 'LK-23',
  Galle: 'LK-31',
  Matara: 'LK-32',
  Hambantota: 'LK-33',
  Jaffna: 'LK-41',
  Kilinochchi: 'LK-42',
  Mannar: 'LK-43',
  Vavuniya: 'LK-44',
  Mullaitivu: 'LK-45',
  Batticaloa: 'LK-51',
  Ampara: 'LK-52',
  Trincomalee: 'LK-53',
  Kurunegala: 'LK-61',
  Puttalam: 'LK-62',
  Anuradhapura: 'LK-71',
  Polonnaruwa: 'LK-72',
  Badulla: 'LK-81',
  Moneragala: 'LK-82',
  Ratnapura: 'LK-91',
  Kegalle: 'LK-92',
};

export function dsdCodeFromLifeCode(lifeCode: string): string {
  return lifeCode.split('-').slice(0, 3).join('-');
}
