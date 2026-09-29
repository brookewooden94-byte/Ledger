// Data storage for Ledger. window.name keeps setup data available when a browser
// treats each file:// page as a separate localStorage origin.
const KEY='ledger-v2-data',WINDOW_PREFIX='ledger-v2:';
const defaults={initialized:false,setupVersion:3,settings:{name:'Friend',currency:'USD',theme:'blush',features:{}},accounts:[],transactions:[],budgets:[],goals:[],bills:[],wishlist:[],subscriptions:[]};
function readWindowData(){try{let raw=window.name||'';return raw.startsWith(WINDOW_PREFIX)?JSON.parse(raw.slice(WINDOW_PREFIX.length)):null}catch{return null}}
function readLocalData(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function data(){let local=readLocalData(),tab=readWindowData(),saved=tab?.initialized?tab:(local||tab);return saved?{...defaults,...saved}:structuredClone(defaults)}
function save(d){let serial=JSON.stringify(d);try{localStorage.setItem(KEY,serial)}catch{}try{window.name=WINDOW_PREFIX+serial}catch{}return d}
function id(){return crypto.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2)}
const Storage={load:data,save,reset(){try{localStorage.removeItem(KEY)}catch{}try{if((window.name||'').startsWith(WINDOW_PREFIX))window.name=''}catch{}},init(values){return save({...defaults,...values,initialized:true,setupVersion:3})},add(collection,item){let d=data();d[collection].push({id:id(),...item});return save(d)},update(collection,itemId,patch){let d=data();let x=d[collection].find(v=>v.id===itemId);if(x)Object.assign(x,patch);return save(d)},remove(collection,itemId){let d=data();d[collection]=d[collection].filter(v=>v.id!==itemId);return save(d)},accountBalance(accountId){return data().transactions.filter(t=>t.accountId===accountId).reduce((n,t)=>n+(t.type==='income'?+t.amount:-+t.amount),0)},stats(){let d=data(),month=new Date().toISOString().slice(0,7),tx=d.transactions.filter(t=>t.date?.startsWith(month));let income=tx.filter(t=>t.type==='income').reduce((n,t)=>n+(+t.amount),0),expenses=tx.filter(t=>t.type==='expense').reduce((n,t)=>n+(+t.amount),0);return {income,expenses,netWorth:d.accounts.reduce((n,a)=>n+Storage.accountBalance(a.id),0)}}};
window.Storage=Storage;
