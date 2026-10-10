/* Capture-time "no crypto" swap for the promo video.
 *
 * Injected into the live app by Playwright (page.addInitScript) so the real screens can be
 * filmed in rupees without touching the app's code. It rewrites what is on screen only:
 *   - USDC amounts become INR (x30, rounded), with Indian digit grouping (₹4,455)
 *   - crypto wording becomes plain money wording (wallet, escrow, Snowtrace, ...)
 *   - wallet addresses become people's names, tx hashes become receipt numbers
 *
 * Set window.__INR_STYLE before this runs:
 *   'prefix' (default) -> ₹150          the Indian convention, no unit chip
 *   'chip'             -> 150 [INR]     keeps the app's unit chip, with INR in it
 */
(() => {
  const RATE = 30; // demo values are tiny USDC numbers; this turns 5 USDC into ₹150
  const style = () => window.__INR_STYLE || 'prefix';
  const sym = () => (style() === 'prefix' ? '₹' : '');

  const toInr = (usdc) => {
    const r = usdc * RATE;
    return r >= 50 ? Math.round(r / 5) * 5 : Math.round(r);
  };
  const fmt = (n) => n.toLocaleString('en-IN');
  const money = (usdc) => sym() + fmt(toInr(usdc));

  // Plain-language replacements for crypto wording. Order matters: longer phrases first.
  const PHRASES = [
    [/Connect wallet/g, 'Get started'],
    [/Sent to your wallet by /g, 'Paid to you by '],
    [/Sent to your wallet/g, 'Paid to you'],
    [/Fund the escrow\./g, 'Fund the hunt.'],
    [/View on Snowtrace/g, 'View receipt'],
    [/Approve USDC/g, 'Confirm payment'],
    [/Staked across your hunts/gi, 'Budget across your hunts'],
    [/Hunter's wallet/g, 'Hunter'],
    [/\bWallet\b/g, 'Hunter'],
    [/\bUSDC\b/g, 'INR'],
  ];

  // Stand-ins for wallet addresses: the same address always gets the same person.
  const PEOPLE = ['Aarav S.', 'Priya M.', 'Rohan K.', 'Ananya I.', 'Kabir D.', 'Meera J.', 'Vihaan R.', 'Isha P.'];
  const PROFILE_HANDLE = '@wildbadger'; // the demo account's own address, under its display name
  const DEMO_SELF = /^0x5aC1/i;
  const people = new Map();
  const personFor = (addr) => {
    const key = addr.toLowerCase().slice(0, 6);
    if (!people.has(key)) people.set(key, PEOPLE[people.size % PEOPLE.length]);
    return people.get(key);
  };
  const ADDRESS = /^0x[0-9a-z]{2,}(…|\.\.\.)?[0-9a-f]*$/i;
  const receiptFor = (hash) => 'TRV-' + (parseInt(hash.replace(/[^0-9a-f]/gi, '').slice(-5) || '4821', 16) % 90000 + 10000);

  // <Tiles> render bare numbers, so only tiles with these labels hold money ("Paid out" is a count).
  const MONEY_TILES = ['On arrival', 'On completion', 'Per hunter', 'Your balance'];
  const isMoneyTile = (el) => {
    const tile = el.closest('.t-value');
    const label = tile && tile.parentElement.querySelector('.t-label');
    return !!label && MONEY_TILES.includes(label.textContent.trim());
  };

  const written = new WeakMap(); // text nodes we already rewrote -> the value we wrote

  function rewriteText(node) {
    const v = node.nodeValue;
    const el = node.parentElement;
    if (!v || !el || written.get(node) === v) return;
    const t = v.trim();
    let out = v;
    let m;

    if ((m = t.match(/^(\+?)(\d+(?:\.\d+)?)$/)) && (el.closest('.money') || isMoneyTile(el))) {
      out = m[1] + money(parseFloat(m[2])); // hero figures, count-ups, tiles
    } else if ((m = t.match(/^\d+\.\d{2}$/)) && el.closest('td')) {
      out = money(parseFloat(t)); // the analytics "Paid" column; counts in tables are integers
    } else if (/^\+?\d+(\.\d+)?\s*per hunter$/.test(t)) {
      out = v.replace(/(\d+(?:\.\d+)?)/, (n) => money(parseFloat(n)));
    } else if (t === 'USDC' && style() === 'prefix') {
      out = ''; // a stand-alone unit label beside a figure that now carries ₹
    } else if (ADDRESS.test(t)) {
      out = /^0xdemo/i.test(t) ? receiptFor(t) : DEMO_SELF.test(t) ? PROFILE_HANDLE : personFor(t);
      el.style.fontFamily = 'inherit'; // names should not look like code
    } else {
      for (const [re, rep] of PHRASES) out = out.replace(re, rep);
    }

    if (out !== v) node.nodeValue = out;
    written.set(node, out);
  }

  function rewriteElements(root) {
    if (!root.querySelectorAll) return;
    // Every unit in this app is a currency. Empty counts too: rewriteText may have blanked it first.
    root.querySelectorAll('.unit-pill, .money-unit, .input-affix__unit').forEach((el) => {
      const t = el.textContent.trim();
      if (!['', 'USDC', 'INR'].includes(t)) return;
      if (style() === 'prefix') el.style.display = 'none';
      else if (t !== 'INR') el.textContent = 'INR';
    });
    // Controlled inputs: React puts its own value back on every re-render, so re-apply whenever
    // the value is no longer the one we wrote (and never convert our own output twice).
    root.querySelectorAll('input').forEach((input) => {
      const v = input.value;
      if (!v || written.get(input) === v) return;
      if (ADDRESS.test(v)) {
        input.value = personFor(v).replace(/ (\w)\.$/, ' $1');
        input.style.fontFamily = 'inherit';
      } else if (input.closest('.input-affix') && /^\d+(\.\d+)?$/.test(v)) {
        input.value = sym() + fmt(toInr(parseFloat(v)));
      } else return;
      written.set(input, input.value);
    });
  }

  function sweep(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = walker.nextNode())) rewriteText(n);
    rewriteElements(root.nodeType === 1 ? root : document.body);
  }

  function start() {
    sweep(document.body);
    new MutationObserver((muts) => {
      for (const mu of muts) {
        if (mu.type === 'characterData') rewriteText(mu.target);
        mu.addedNodes.forEach((n) => (n.nodeType === 3 ? rewriteText(n) : n.nodeType === 1 && sweep(n)));
      }
      rewriteElements(document.body);
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
    // React sets input values as properties, which no MutationObserver sees.
    setInterval(() => rewriteElements(document.body), 250);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
