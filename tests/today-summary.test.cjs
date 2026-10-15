const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {renderNarrationDocument,collectNarration}=require('../scripts/collect-narration.cjs');
const base=JSON.parse(fs.readFileSync('public/data/site_payload.json','utf8'));
function fixture(){
 const payload=structuredClone(base);
 payload.observatory_summary={title:'Today at the Observatory',timezone:'Europe/London',periods:
  ['today','yesterday','five_days'].map((id,index)=>({id,label:['Today so far','Yesterday','Last 5 days'][index],
   headline:['River levels steady','Moderate changes in river level','Large changes in river level'][index],
   paragraph:`Example ${index}: 2 mm of rain, water depth 8 to 9 cm.`,speech:`Example ${index}. 2 millimetres of rain. 8 to 9 centimetres.`,
   valid_until:'2099-01-01T00:00:00Z',stale:{headline:'Insufficient readings',paragraph:'Summary is out of date.',speech:'Insufficient readings. Summary is out of date.'}}))};
 return payload;
}
test('summary is between introduction and river summary and tabs are keyboard accessible',async()=>{
 const dom=await renderNarrationDocument(fixture());
 try {
  const w=dom.window,d=w.document,section=d.getElementById('observatorySummary');
  assert.equal(section.hidden,false);
  assert.equal(section.previousElementSibling.id,'top');
  assert.equal(section.nextElementSibling.id,'readings');
  const tabs=[...section.querySelectorAll('[role="tab"]')];
  assert.equal(tabs.length,3);assert.equal(tabs[0].tabIndex,0);
  tabs[0].dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(tabs[1].getAttribute('aria-selected'),'true');assert.equal(d.activeElement,tabs[1]);
  assert.equal(d.getElementById('todayContent').getAttribute('aria-labelledby'),tabs[1].id);
  assert.equal(w.readAloudText(section),fixture().observatory_summary.periods[1].speech);
  tabs[1].dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
  assert.equal(tabs[2].getAttribute('aria-selected'),'true');
  assert.equal(section.querySelectorAll('p').length,1);
 }finally{dom.window.close();}
});
test('summary playback switches visible labels and tab selection cancels audio',async()=>{
 const dom=await renderNarrationDocument(fixture());
 try{
  const d=dom.window.document,button=d.querySelector('#observatorySummary .read-aloud-button');
  button.click();assert.equal(button.textContent.trim(),'Stop reading');
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.match(dom.audio.src,/assets\/audio\/.*\.mp3$/);
  d.getElementById('today-tab-yesterday').click();
  assert.equal(button.textContent.trim(),'Read aloud');assert.equal(dom.audio.getAttribute('src'),null);
  button.click();await new Promise(resolve=>setTimeout(resolve,20));
  button.click();assert.equal(button.textContent.trim(),'Read aloud');
 }finally{dom.window.close();}
});
test('build includes every tab and stale fallback and expiry clears current claims',async()=>{
 const payload=fixture();
 const clips=await collectNarration(payload);
 for(const period of payload.observatory_summary.periods){
  assert.ok(clips.some(clip=>clip.text===period.speech));
  assert.ok(clips.some(clip=>clip.text===period.stale.speech));
 }
 payload.observatory_summary.periods[0].valid_until='2000-01-01T00:00Z';
 const dom=await renderNarrationDocument(payload);
 try{
  assert.equal(dom.window.document.getElementById('todayHeadline').textContent,'Insufficient readings');
  assert.equal(dom.window.readAloudText(dom.window.document.getElementById('observatorySummary')),payload.observatory_summary.periods[0].stale.speech);
 }finally{dom.window.close();}
});
