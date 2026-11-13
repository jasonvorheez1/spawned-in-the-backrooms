// Categories are derived; old section keys remain the only stored destination.
export const CATEGORIES=[['personal','Personalisation',['THEMES','BACKGROUND','FONTS','EFFECTS','HOME BUTTON']],['workspace','Workspace',['SHORTCUTS','CAMERA','PLAY-MODE ORB','KILN']],['notifications','Notifications',['NOTIFICATIONS']],['game','Game',['ENVIRONMENT','GAME RULES']]];
export const UTILITIES=['ARCHIVE','ABOUT SLATE'];
export const SECTIONS=[...CATEGORIES.flatMap(x=>x[2]),...UTILITIES];
export const sectionOf=k=>SECTIONS.includes(k)?k:'THEMES';
export const categoryOf=k=>CATEGORIES.find(x=>x[2].includes(k));
// Personal side adaptation credited to @robot / MOG; no apps, themes or content imported.
export function tabPosition(player,plan){const s=player?.state||{},o=plan.orb||{};return {side:['left','right'].includes(s.slateSide)?s.slateSide:(o.x>50?'right':'left'),height:Math.max(4,Math.min(94,Number.isFinite(Number(s.slateTabHeight??o.y))?Number(s.slateTabHeight??o.y):50))};}
export function tabStyle(player,plan){const {side,height}=tabPosition(player,plan);return `${side}:${side==='right'?'calc(var(--spawn-chrome-reservation-right-inset,50px) + 8px)':'var(--spawn-safe-area-left,0px)'};top:clamp(110px,${height}vh,calc(100vh - 110px));`;}
