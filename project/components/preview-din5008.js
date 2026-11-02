/* The parts Invoice and Letterhead share on their DIN 5008 Form B page: fold and hole-punch marks, logo, sender,
   return address line, address window and footer. They go into every element with the attribute data-din5008
   (the page itself: its own content stays between the two). The logo is mounted by preview-shared.js.
   Loaded with <script src="../preview-din5008.js"></script> at the end of the <body>, before preview-shared.js. */
(function () {
  var frame = [
    '<div class="mk" style="top:298px;width:14px"></div>',
    '<div class="mk" style="top:421px;width:20px"></div>',
    '<div class="mk" style="top:595px;width:14px"></div>',
    '<div style="position:absolute;left:71px;top:40px;color:var(--text-primary)" data-logo="wordmark" data-h="26"></div>',
    '<div class="ab" style="right:57px;top:40px;text-align:right;font-size:8.5px;line-height:13px">Patrick Klein<br>Infrastructure &amp; Cloud Engineering<br>[Straße Nr.] · [PLZ] Lippstadt<br>[mail]@pklnx.space · pklnx.space</div>',
    '<div class="ab" style="left:71px;top:128px;width:241px;font-size:7px;line-height:10px;border-bottom:1px solid var(--border-subtle-00)">pklnx.space · Patrick Klein · [Straße Nr.] · [PLZ] Lippstadt</div>',
    '<div style="position:absolute;left:71px;top:142px;width:241px;font-size:10px;line-height:15px">[Firma]<br>[Ansprechperson]<br>[Straße Nr.]<br>[PLZ Ort]</div>'
  ].join('\n');
  var foot = [
    '<div class="foot">',
    '<div><span class="lbl">Kontakt</span><br>[mail]@pklnx.space<br>[Telefon]</div>',
    '<div><span class="lbl">Bank</span><br>[Bank]<br>IBAN [IBAN]</div>',
    '<div><span class="lbl">Steuer</span><br>Steuernummer [STEUERNUMMER]<br>[USt-IdNr. falls vorhanden]</div>',
    '</div>'
  ].join('\n');
  document.querySelectorAll('[data-din5008]').forEach(function (page) {
    page.insertAdjacentHTML('afterbegin', frame);
    page.insertAdjacentHTML('beforeend', foot);
  });
})();
