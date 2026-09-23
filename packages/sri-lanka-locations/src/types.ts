export type LocationLocale = 'en' | 'si' | 'ta';

export type LocationKind = 'province' | 'district' | 'dsd' | 'gnd';

export type LocationDivision = {
  kind: LocationKind;
  code: string;
  nameEn: string;
  nameSi: string;
  nameTa: string;
  parentCode?: string;
};

export type LocationStats = {
  provinces: number;
  districts: number;
  dsds: number;
  gnds: number;
  source: 'sl-gnd-dsd-districts';
};
