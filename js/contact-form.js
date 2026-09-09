/* Shows the chosen services on the closed picker, so collapsing it does not
   hide what you picked. Progressive enhancement only: without this the label
   stays "Choose one or more" and the form still submits every checked box. */
(function () {
  var picker = document.querySelector('.svc-select');
  if (!picker) return;

  var text = picker.querySelector('.svc-summary-text');
  var boxes = picker.querySelectorAll('input[type="checkbox"][name="services"]');
  if (!text || !boxes.length) return;

  var placeholder = text.textContent;

  function sync() {
    var chosen = [];
    for (var i = 0; i < boxes.length; i++) {
      if (boxes[i].checked) {
        var label = boxes[i].nextElementSibling;
        chosen.push(label ? label.textContent : boxes[i].value);
      }
    }
    if (chosen.length) {
      text.textContent = chosen.join(', ');
      text.removeAttribute('data-empty');
    } else {
      text.textContent = placeholder;
      text.setAttribute('data-empty', '');
    }
  }

  for (var i = 0; i < boxes.length; i++) boxes[i].addEventListener('change', sync);
  sync();   // reflect anything the browser restored on a back-navigation
})();
