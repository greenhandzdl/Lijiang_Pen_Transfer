export type PlaceId = 'elephant' | 'towers' | 'yangbridge' | 'glassbridge';
export type TimeOfDay = 'day' | 'dusk' | 'night';
export type VisitMode = 'guided' | 'free';

export type Place = {
  id: PlaceId;
  name: string;
  number: string;
  worldX: number;
  markerY: number;
  eyebrow: string;
  description: string;
  hint: string;
};

// All coordinates follow the actual 2172 x 724 panoramic image, NOT CSS pixels.
// This is an artistic sequence; it is not a geographically accurate walking itinerary.
export const WORLD_WIDTH = 2172;
export const WORLD_HEIGHT = 724;

export const PLACES: readonly Place[] = [
  {
    id: 'elephant', number: '壹', name: '象鼻山', worldX: 172, markerY: 446,
    eyebrow: '山水开卷',
    description: '山石临江，天光入水。象鼻山的轮廓，正是这幅画卷的第一笔。',
    hint: '从此处出发，沿着画中的岸线缓缓前行。',
  },
  {
    id: 'towers', number: '贰', name: '日月双塔', worldX: 793, markerY: 448,
    eyebrow: '塔影入波',
    description: '一金一银，两座塔在青山与江色间相望；傍晚余晖和夜间灯火各有风致。',
    hint: '试试在白昼、夕照、入夜之间切换画面。',
  },
  {
    id: 'yangbridge', number: '叁', name: '阳桥', worldX: 1326, markerY: 381,
    eyebrow: '一桥横波',
    description: '石桥起伏，栏杆临水。穿桥而过的清风，把两岸人间连成一卷。',
    hint: '可拖动画面仔细观看桥拱和水中倒影。',
  },
  {
    id: 'glassbridge', number: '肆', name: '玻璃桥', worldX: 1837, markerY: 443,
    eyebrow: '听风对歌',
    description: '水边亭廊，灯影摇曳。旅人驻足，向远处青山轻唱一声。',
    hint: '体验“对山歌”姿态演示；音频留待正式授权素材。',
  },
] as const;

export function getPlace(id: PlaceId): Place {
  return PLACES.find((p) => p.id === id) ?? PLACES[0];
}

export const TIMES: readonly { id: TimeOfDay; label: string; caption: string; image: string }[] = [
  { id: 'day', label: '清昼', caption: '山色如洗', image: 'scene-day.webp' },
  { id: 'dusk', label: '夕照', caption: '金波映山', image: 'scene-dusk.webp' },
  { id: 'night', label: '入夜', caption: '塔影流光', image: 'scene-night.webp' },
];
