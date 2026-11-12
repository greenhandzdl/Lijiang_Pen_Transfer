import type { PlaceId, TimeOfDay } from './places';

/**
 * Interactions are authored data rather than code branches tied to a Pixi ticker.
 * Dialogue and actions below are PROTOTYPE COPY, not verified folk quotations.
 */
export type EncounterId = 'fisher' | 'cormorant' | 'fishmarket' | 'night-stage';
export type NightView = 'shore' | 'boat';

export interface DialogueChoice {
  id: string;
  label: string;
  answer: string;
  navigateTo?: PlaceId;
  splash?: boolean;
}

export interface Encounter {
  id: EncounterId;
  time: TimeOfDay;
  place: PlaceId;
  worldX: number;
  worldY: number;
  title: string;
  kicker: string;
  intro: string;
  detail: string;
  choices: readonly DialogueChoice[];
}

export const ENCOUNTERS: readonly Encounter[] = [
  {
    id: 'fisher',
    time: 'morning',
    place: 'elephant',
    worldX: 332,
    worldY: 424,
    title: '江岸渔人',
    kicker: '清晨 · 整理竹筏',
    intro: '一位渔人正在江岸整理竹筏和竹篙。你可以停下脚步，向他问路。',
    detail: '当前是点击与对话的交互样机；整理竹筏动画与正式人物立绘等待美术资源。',
    choices: [
      {
        id: 'ask-elephant',
        label: '请问象鼻山怎么走？',
        answer: '渔人：沿画中的江岸朝山影处望去，便是象鼻山。这里的行走路线是艺术化编排，并非实际导航。',
        navigateTo: 'elephant',
      },
      {
        id: 'ask-raft',
        label: '竹筏何时可以出发？',
        answer: '渔人：待江面平静、竹篙备妥，再顺着水势慢慢走。此处尚未开放真正的乘筏玩法。',
      },
    ],
  },
  {
    id: 'cormorant',
    time: 'noon',
    place: 'towers',
    worldX: 1048,
    worldY: 493,
    title: '鸬鹚捕鱼',
    kicker: '正午 · 江面生计',
    intro: '阳光照着江面，鸬鹚捕鱼与渔民劳作的场景即将展开。',
    detail: '演示阶段仅提供点击涟漪反馈；鸬鹚游水、潜水、衔鱼、回筏都需要独立动画素材。',
    choices: [
      {
        id: 'watch-dive',
        label: '观看一次捕鱼',
        answer: '水面泛起一圈圈波纹。这是涟漪交互预览；完整的鸬鹚捕鱼动作仍待制作。',
        splash: true,
      },
      {
        id: 'learn-craft',
        label: '了解捕鱼技艺',
        answer: '这一段将接入经核实的当地渔事资料与字幕。当前文案仅为功能占位，不代表历史考证结论。',
      },
    ],
  },
  {
    id: 'fishmarket',
    time: 'noon',
    place: 'yangbridge',
    worldX: 1442,
    worldY: 459,
    title: '岸边鱼市',
    kicker: '正午 · 人间烟火',
    intro: '岸边围起了小小的鱼摊。你可以询问今日的渔获，体验一段购买对话。',
    detail: '购买是剧情模拟，不涉及真实货币、支付或订单。',
    choices: [
      {
        id: 'ask-catch',
        label: '问问今日捕到了什么',
        answer: '摊主：今日的渔获可要慢慢挑。品类、渔法和生态内容会在资料核实后补充。',
      },
      {
        id: 'buy-fish',
        label: '买一尾鱼（演示）',
        answer: '摊主把鱼包好递给你。演示交易完成！当前没有金额、库存或后台支付。',
      },
    ],
  },
  {
    id: 'night-stage',
    time: 'night',
    place: 'glassbridge',
    worldX: 1798,
    worldY: 320,
    title: '夜游漓江',
    kicker: '入夜 · 江上光影',
    intro: '选择岸边或船上观看，逐段点亮江岸灯光，欣赏山歌和无人机灯光的概念预演。',
    detail: '夜景灯光叠加、波纹和无人机光点是矢量效果演示；同步音乐、真实船只及编队动画尚待资源。',
    choices: [],
  },
] as const;

export function encountersFor(time: TimeOfDay): readonly Encounter[] {
  return ENCOUNTERS.filter((encounter) => encounter.time === time);
}
export function findEncounter(id: EncounterId): Encounter {
  const encounter = ENCOUNTERS.find((item) => item.id === id);
  if (!encounter) throw new Error(`Unknown encounter: ${id}`);
  return encounter;
}
