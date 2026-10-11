/* =========================================================
   Animações do portfólio
   - Revelação ao entrar na tela (IntersectionObserver), em cascata.
   - Os efeitos em si ficam no CSS (transform/opacity/clip-path); este arquivo
     só decide QUANDO cada elemento aparece e com que atraso.
   - Ajuste tudo em CONFIG. Nada depende do JS para ficar legível:
     sem JS, com redução de movimento ou se este arquivo falhar,
     o conteúdo aparece direto (ver script no <head> e style.css).
   ========================================================= */
(function () {
    'use strict';

    var CONFIG = {
        duracao: 800,        // ms · duração base das transições
        distancia: 36,       // px · deslocamento de entrada
        easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
        escalonamento: 110,  // ms · atraso entre elementos que entram juntos
        escalonamentoLinhas: 130, // ms · atraso entre linhas do título
        atrasoInicial: 150,  // ms · espera antes da primeira revelação
        limiar: 0.18,        // fração do elemento visível para disparar
        repetir: false       // true = reanima ao sair e voltar à tela
    };

    var raiz = document.documentElement;
    var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Sem animação: o CSS já não esconde nada (classe "js" não foi adicionada).
    if (reduzMovimento.matches || !raiz.classList.contains('js')) return;

    // Sem IntersectionObserver: mostra tudo imediatamente.
    if (!('IntersectionObserver' in window)) {
        raiz.classList.add('sem-anim');
        return;
    }

    // Repassa a configuração ao CSS
    raiz.style.setProperty('--anim-dur', CONFIG.duracao + 'ms');
    raiz.style.setProperty('--anim-dist', CONFIG.distancia + 'px');
    raiz.style.setProperty('--anim-ease', CONFIG.easing);

    /* Título: cada linha (separada por <br>) vira uma "máscara" de onde o texto sobe */
    function dividirLinhas(titulo) {
        var linhas = [[]];
        Array.prototype.forEach.call(titulo.childNodes, function (no) {
            if (no.nodeName === 'BR') linhas.push([]);
            else linhas[linhas.length - 1].push(no);
        });

        titulo.setAttribute('aria-label', titulo.textContent.replace(/\s+/g, ' ').trim());
        titulo.textContent = '';

        linhas.forEach(function (nos, i) {
            var texto = nos.map(function (n) { return n.textContent; }).join('').trim();
            if (!texto) return;
            var linha = document.createElement('span');
            var interno = document.createElement('span');
            linha.className = 'linha';
            linha.setAttribute('aria-hidden', 'true');
            // Preserva marcações dentro da linha (ex.: <span class="extra">), aparando só os espaços das pontas
            nos.forEach(function (n) { interno.appendChild(n.cloneNode(true)); });
            if (interno.firstChild && interno.firstChild.nodeType === 3) interno.firstChild.textContent = interno.firstChild.textContent.replace(/^\s+/, '');
            if (interno.lastChild && interno.lastChild.nodeType === 3) interno.lastChild.textContent = interno.lastChild.textContent.replace(/\s+$/, '');
            interno.style.setProperty('--atraso-linha', (CONFIG.atrasoInicial + i * CONFIG.escalonamentoLinhas) + 'ms');
            linha.appendChild(interno);
            titulo.appendChild(linha);
        });
    }

    var alvos = Array.prototype.slice.call(document.querySelectorAll('[data-anim]'));
    alvos.forEach(function (el) {
        if (el.getAttribute('data-anim') === 'linhas') dividirLinhas(el);
    });

    function revelar(el, atraso) {
        el.style.setProperty('--atraso', atraso + 'ms');
        el.classList.add('visivel');
    }

    var primeiroLote = true;
    function aoCruzar(entradas, observador) {
        // Elementos que entram no mesmo instante sobem em cascata, na ordem do documento
        var entrando = entradas.filter(function (e) { return e.isIntersecting; });
        entrando.sort(function (a, b) {
            return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });

        entrando.forEach(function (e, i) {
            var extra = parseInt(e.target.getAttribute('data-atraso'), 10) || 0;
            revelar(e.target, (primeiroLote ? CONFIG.atrasoInicial : 0) + i * CONFIG.escalonamento + extra);
            if (!CONFIG.repetir) observador.unobserve(e.target);
        });

        if (!CONFIG.repetir) return;
        entradas.forEach(function (e) {
            if (!e.isIntersecting) e.target.classList.remove('visivel');
        });
    }

    // Riscos e marca-textos começam com largura 0 (scale), então precisam de limiar 0
    var TRACOS = { marca: 1, risco: 1 };
    var observador = new IntersectionObserver(aoCruzar, { threshold: CONFIG.limiar });
    var observadorTracos = new IntersectionObserver(aoCruzar, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

    alvos.forEach(function (el) {
        (TRACOS[el.getAttribute('data-anim')] ? observadorTracos : observador).observe(el);
    });
    // O primeiro callback já chegou (síncrono após observe, no próximo frame); depois dele não há atraso inicial.
    requestAnimationFrame(function () { requestAnimationFrame(function () { primeiroLote = false; }); });

    // Se o usuário ativar "reduzir movimento" com a página aberta, mostra tudo
    var aoMudar = function () {
        if (reduzMovimento.matches) {
            raiz.classList.remove('js');
            observador.disconnect();
            observadorTracos.disconnect();
        }
    };
    if (reduzMovimento.addEventListener) reduzMovimento.addEventListener('change', aoMudar);
    else if (reduzMovimento.addListener) reduzMovimento.addListener(aoMudar);

    raiz.classList.add('anim-ativo');
})();
