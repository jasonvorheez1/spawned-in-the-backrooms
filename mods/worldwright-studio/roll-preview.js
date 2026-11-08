export const updateSchedule={every:{seconds:1}};
export function update(ctx){
  const owner=ctx.getObject(ctx.self.state.rollOwner);
  if(owner&&owner.state.ui&&owner.state.ui.pianoRoll&&owner.state.ui.pianoRoll.inline){const cards=owner.state.ui.cards||{};if(cards.view!=="page"||!cards.pageDoc||cards.pageDoc.pageId!==ctx.self.state.pageId){ctx.destroy(ctx.self.id);return;}}
  if(!owner||!owner.state.ui||!owner.state.ui.pianoRoll||!owner.state.ui.pianoRoll.open)ctx.destroy(ctx.self.id);
}
