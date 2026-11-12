export type PlaceId = 'elephant' | 'towers' | 'yangbridge' | 'glassbridge';
export type TimeOfDay = 'day' | 'sunset' | 'night';
export type VisitMode = 'guided' | 'free';

export interface Place {
  id: PlaceId;
  name: string;
  label: string;
  x: number;
  description: string;
  action: string;
}

export const PLACES: readonly Place[] = [
  {
    id: 'elephant',
    name: '象鼻山',
    label: '01',
    x: 260,
    description: '山形如象，垂鼻临水。从这一抹青绿起笔，随画中人步入漓江长卷。',
    action: '在江边驻足，轻触画卷泛起涟漪。',
  },
  {
    id: 'towers',
    name: '日月双塔',
    label: '02',
    x: 1050,
    description: '塔影立于水天之间，晨昏变幻，澄波与彩云相映。',
    action: '切换暮色与夜色，感受画面的明暗变化。',
  },
  {
    id: 'yangbridge',
    name: '阳桥',
    label: '03',
    x: 1620,
    description: '一桥跨水，柳影轻摇。沿画卷横向漫游，观察桥畔日常。',
    action: '拖动山水，看看画面里藏着哪些细节。',
  },
  {
    id: 'glassbridge',
    name: '玻璃桥',
    label: '04',
    x: 2240,
    description: '夜色初合，江上清风送来歌声。画中旅人邀你听一曲山歌。',
    action: '点击「对山歌」观看人物演示姿态。',
  },
] as const;

export const getPlace = (id: PlaceId): Place =>
  PLACES.find((place) => place.id === id) ?? PLACES[0];
