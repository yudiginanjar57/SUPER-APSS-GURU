const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<p>Here is some math <span class="katex"><span class="katex-mathml"><math>x^2</math></span><span class="katex-html">visual</span></span></p>`);
const doc = dom.window.document;
doc.querySelectorAll('.katex').forEach(katexEl => {
  const mathml = katexEl.querySelector('.katex-mathml math');
  if (mathml) {
    katexEl.replaceWith(mathml);
  }
});
console.log(doc.body.innerHTML);
