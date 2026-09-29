// Final-step safety net: save first, then navigate only to the data-carrying URL.
document.addEventListener('click',event=>{let button=event.target.closest('#enterLedger');if(!button)return;event.preventDefault();event.stopImmediatePropagation();try{finish()}catch(error){console.error(error);alert('Ledger could not save your setup. Please try again.')}} ,true);
