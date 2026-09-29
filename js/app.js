if(!document.getElementById('ledgerDelight'))document.head.insertAdjacentHTML('beforeend','<link id="ledgerDelight" rel="stylesheet" href="css/delight.css"><link id="ledgerThemes" rel="stylesheet" href="css/themes.css">');
document.addEventListener('click',event=>{let control=event.target.closest('button,.button');if(!control)return;let box=control.getBoundingClientRect(),spark=document.createElement('i');spark.className='click-spark';spark.style.left=(box.left+box.width/2-4)+'px';spark.style.top=(box.top+box.height/2-4)+'px';document.body.append(spark);setTimeout(()=>spark.remove(),650)});
// Setup passes a one-time payload in the URL. This is reliable in file:// browsers
// that isolate or block localStorage between individual pages.
document.addEventListener('DOMContentLoaded',()=>{
  let setupPayload=new URLSearchParams(location.search).get('ledgerSetup');
  if(setupPayload){
    try{Storage.init(JSON.parse(setupPayload));history.replaceState(null,'',location.pathname)}catch(error){console.warn('Ledger setup handoff could not be restored.',error)}
  }
  let d=Storage.load(),page=document.body.dataset.page;
  document.body.dataset.theme=d.settings.theme||'blush';
  window.render?.();
  document.querySelectorAll('a[href="index.html"]').forEach(link=>link.href='dashboard.html');
  document.querySelectorAll('a[href="setup.html"]').forEach(link=>link.href='index.html');
  let resetButton=document.getElementById('reset');
  if(resetButton)resetButton.onclick=()=>{if(confirm('Delete all Ledger data?')){Storage.reset();location.href='index.html'}};
  document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
  document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>document.getElementById(b.dataset.open).classList.add('show'));
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('show'));
});
