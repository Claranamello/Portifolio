/* =========================================================
   Projetos em destaque (pastas da capa)
   - Cada pasta mostra a capa de um projeto; os projetos se alternam
     sozinhos, uma pasta por vez, com troca suave.
   - O cursor sobre a barra (ou o foco do teclado) PAUSA a alternância:
     a pasta sob o cursor se mantém e se abre, com as folhas em leque
     acompanhando levemente o movimento do mouse.
   - Os dados vêm do JSON #destaques-dados (index.html). Ajuste os tempos em CONFIG.
   ========================================================= */
(function () {
    'use strict';

    var CONFIG = {
        intervalo: 5000,   // ms · tempo para a mesma pasta trocar de projeto
        duracaoTroca: 560, // ms · quanto a capa leva para "entrar" na pasta antes de trocar
        suavizacao: 0.14   // 0–1 · suavidade do movimento das folhas com o mouse
    };

    var fonte = document.getElementById('destaques-dados');
    var itens = Array.prototype.slice.call(document.querySelectorAll('.pasta-item'));
    var barra = document.querySelector('.barra-lateral');
    if (!fonte || !itens.length || !barra) return;

    var dados;
    try { dados = JSON.parse(fonte.textContent); } catch (e) { return; }
    if (!Array.isArray(dados) || !dados.length) return;

    var reduzMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

    // pré-carrega as imagens para a troca não "piscar"
    dados.forEach(function (d) {
        [d.capa].concat(d.fotos || []).forEach(function (src) {
            if (src) { var im = new Image(); im.src = src; }
        });
    });

    var exibidos = itens.map(function (_, i) { return i % dados.length; });
    var proximo = itens.length % dados.length;

    /* ---------- preenche uma pasta com um projeto ---------- */
    function aplicar(item, proj) {
        var capa = item.querySelector('.pasta__capa');
        var img = capa.querySelector('img');

        item.style.setProperty('--c', proj.cor || '#ffd60a');
        item.setAttribute('href', proj.link || '#projetos');

        if (proj.capa) {
            img.src = proj.capa;
            img.alt = 'Capa do projeto ' + (proj.titulo || '');
            img.hidden = false;
            capa.classList.add('com-imagem');
        } else {
            img.removeAttribute('src');
            img.alt = '';
            img.hidden = true;
            capa.classList.remove('com-imagem');
        }

        ['a', 'b'].forEach(function (k, i) {
            var folha = item.querySelector('.pasta__folha--' + k);
            var src = (proj.fotos || [])[i];
            folha.textContent = '';
            folha.classList.toggle('com-imagem', !!src);
            if (src) {
                var im = document.createElement('img');
                im.alt = '';
                im.src = src;
                folha.appendChild(im);
            }
        });

        item.querySelector('.legenda__pg').textContent = proj.categoria || '';
        item.querySelector('.legenda__txt').textContent = proj.titulo || '';
    }

    itens.forEach(function (item, i) { aplicar(item, dados[exibidos[i]]); });

    // com 3 pastas visíveis, é preciso ao menos 1 projeto extra para alternar
    if (dados.length <= itens.length) return;

    /* ---------- alternância automática ---------- */
    function escolher() {
        for (var t = 0; t < dados.length; t++) {
            var c = (proximo + t) % dados.length;
            if (exibidos.indexOf(c) === -1) { proximo = (c + 1) % dados.length; return c; }
        }
        return null;
    }

    var emPausa = false;      // cursor/foco na barra
    var visivel = true;       // barra está na tela
    var ocupado = false;      // há uma troca em andamento
    var vez = 0;

    function trocar(slot) {
        var item = itens[slot];
        var novo = escolher();
        if (novo === null || item.classList.contains('aberta')) return;

        ocupado = true;
        item.classList.add('trocando');
        window.setTimeout(function () {
            aplicar(item, dados[novo]);
            exibidos[slot] = novo;
            window.requestAnimationFrame(function () {
                item.classList.remove('trocando');
                ocupado = false;
            });
        }, CONFIG.duracaoTroca);
    }

    function passo() {
        if (emPausa || !visivel || ocupado || document.hidden || reduzMovimento.matches) return;
        trocar(vez % itens.length);
        vez++;
    }

    // uma pasta por tick: cada pasta troca a cada "intervalo", defasadas entre si
    var relogio = window.setInterval(passo, Math.round(CONFIG.intervalo / itens.length));

    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; }, { threshold: 0.2 }).observe(barra);
    }

    /* ---------- cursor: pausa + pasta aberta + folhas acompanhando o mouse ---------- */
    barra.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'touch') emPausa = true; });
    barra.addEventListener('pointerleave', function () { emPausa = false; });
    barra.addEventListener('focusin', function () { emPausa = true; });
    barra.addEventListener('focusout', function (e) { if (!barra.contains(e.relatedTarget)) emPausa = false; });

    itens.forEach(function (item) {
        var alvo = { x: 0, y: 0 }, atual = { x: 0, y: 0 }, quadro = 0;

        function animar() {
            atual.x += (alvo.x - atual.x) * CONFIG.suavizacao;
            atual.y += (alvo.y - atual.y) * CONFIG.suavizacao;
            item.style.setProperty('--px', atual.x.toFixed(3));
            item.style.setProperty('--py', atual.y.toFixed(3));
            if (Math.abs(alvo.x - atual.x) > 0.002 || Math.abs(alvo.y - atual.y) > 0.002) {
                quadro = window.requestAnimationFrame(animar);
            } else { quadro = 0; }
        }
        function mover() { if (!quadro) quadro = window.requestAnimationFrame(animar); }

        item.addEventListener('pointerenter', function (e) {
            if (e.pointerType === 'touch') return;
            item.classList.add('aberta');
        });

        item.addEventListener('pointermove', function (e) {
            if (e.pointerType === 'touch' || reduzMovimento.matches) return;
            var r = item.getBoundingClientRect();
            alvo.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
            alvo.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
            mover();
        });

        item.addEventListener('pointerleave', function () {
            item.classList.remove('aberta');
            alvo.x = 0; alvo.y = 0;
            mover();
        });

        item.addEventListener('focus', function () { item.classList.add('aberta'); });
        item.addEventListener('blur', function () { item.classList.remove('aberta'); });
    });

    // evita relógio órfão se a página for descarregada
    window.addEventListener('pagehide', function () { window.clearInterval(relogio); });
})();
