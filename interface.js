/* =========================================================
   Interface: modo escuro, menu lateral e formulário de contato
   ========================================================= */
(function () {
    'use strict';

    var raiz = document.documentElement;

    /* ---------------------------------------------------------
       1) MODO ESCURO
       O estado inicial é definido no <head> (sem "flash"). Aqui fica o botão.
       --------------------------------------------------------- */
    var CHAVE_TEMA = 'tema-portfolio';
    var botaoTema = document.getElementById('tema-botao');

    function temaAtual() { return raiz.getAttribute('data-tema') === 'escuro' ? 'escuro' : 'claro'; }

    function atualizarBotao() {
        if (!botaoTema) return;
        var escuro = temaAtual() === 'escuro';
        botaoTema.setAttribute('aria-pressed', escuro ? 'true' : 'false');
        botaoTema.setAttribute('aria-label', escuro ? 'Desativar modo escuro' : 'Ativar modo escuro');
    }

    function definirTema(tema, animar) {
        if (animar) {
            raiz.classList.add('tema-anim');
            window.setTimeout(function () { raiz.classList.remove('tema-anim'); }, 520);
        }
        if (tema === 'escuro') raiz.setAttribute('data-tema', 'escuro');
        else raiz.removeAttribute('data-tema');
        atualizarBotao();
    }

    atualizarBotao();

    if (botaoTema) {
        botaoTema.addEventListener('click', function () {
            var novo = temaAtual() === 'escuro' ? 'claro' : 'escuro';
            definirTema(novo, true);
            try { localStorage.setItem(CHAVE_TEMA, novo); } catch (e) { /* armazenamento indisponível */ }
        });
    }

    // Sem escolha salva, acompanha a preferência do sistema
    if (window.matchMedia) {
        var sistema = window.matchMedia('(prefers-color-scheme: dark)');
        var aoMudarSistema = function (e) {
            var salvo = null;
            try { salvo = localStorage.getItem(CHAVE_TEMA); } catch (err) { }
            if (!salvo) definirTema(e.matches ? 'escuro' : 'claro', true);
        };
        if (sistema.addEventListener) sistema.addEventListener('change', aoMudarSistema);
        else if (sistema.addListener) sistema.addListener(aoMudarSistema);
    }

    /* ---------------------------------------------------------
       2) MENU LATERAL (escondido; abre pelo chamado "Menu")
       --------------------------------------------------------- */
    var menu = document.getElementById('menu');
    var aba = document.getElementById('menu-aba');
    var fundo = document.getElementById('menu-fundo');
    var fechar = document.getElementById('menu-fechar');

    if (menu && aba) {
        var links = Array.prototype.slice.call(menu.querySelectorAll('a'));
        var aberto = false;

        var focaveis = function () {
            return Array.prototype.slice.call(menu.querySelectorAll('a, button'));
        };

        var abrir = function () {
            aberto = true;
            menu.removeAttribute('inert');
            menu.setAttribute('aria-hidden', 'false');
            menu.classList.add('aberto');
            raiz.classList.add('menu-aberto');
            aba.setAttribute('aria-expanded', 'true');
            aba.setAttribute('aria-label', 'Fechar menu de navegação');
            window.setTimeout(function () { (links[0] || fechar).focus(); }, 60);
        };

        var fecharMenu = function (devolverFoco) {
            if (!aberto) return;
            aberto = false;
            menu.classList.remove('aberto');
            raiz.classList.remove('menu-aberto');
            menu.setAttribute('aria-hidden', 'true');
            menu.setAttribute('inert', '');
            aba.setAttribute('aria-expanded', 'false');
            aba.setAttribute('aria-label', 'Abrir menu de navegação');
            if (devolverFoco !== false) aba.focus();
        };

        aba.addEventListener('click', function () { aberto ? fecharMenu() : abrir(); });
        if (fechar) fechar.addEventListener('click', function () { fecharMenu(); });
        if (fundo) fundo.addEventListener('click', function () { fecharMenu(); });

        document.addEventListener('keydown', function (e) {
            if (!aberto) return;
            if (e.key === 'Escape') { e.preventDefault(); fecharMenu(); return; }
            if (e.key === 'Tab') {                        // mantém o foco dentro do menu
                var f = focaveis();
                if (!f.length) return;
                var primeiro = f[0], ultimo = f[f.length - 1];
                if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
                else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
            }
        });

        // navegar: fecha o menu e rola até a seção
        links.forEach(function (a) {
            a.addEventListener('click', function (e) {
                var id = (a.getAttribute('href') || '').replace('#', '');
                var alvo = id && document.getElementById(id);
                if (!alvo) return;
                e.preventDefault();
                fecharMenu(false);
                var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                alvo.scrollIntoView({ behavior: reduz ? 'auto' : 'smooth', block: 'start' });
                if (history.replaceState) history.replaceState(null, '', '#' + id);
            });
        });

        // destaca no menu a seção que está na tela
        if ('IntersectionObserver' in window) {
            var porId = {};
            links.forEach(function (a) { porId[a.getAttribute('data-alvo')] = a; });
            var secoes = Object.keys(porId).map(function (id) { return document.getElementById(id); }).filter(Boolean);
            var obs = new IntersectionObserver(function (entradas) {
                entradas.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    links.forEach(function (a) { a.removeAttribute('aria-current'); });
                    var a = porId[en.target.id];
                    if (a) a.setAttribute('aria-current', 'true');
                });
            }, { threshold: 0.45 });
            secoes.forEach(function (s) { obs.observe(s); });
        }
    }

    /* ---------------------------------------------------------
       3) FORMULÁRIO DE CONTATO (envio de e-mail via FormSubmit)
       Preencha data-destino no <form id="form-contato"> com o seu e-mail.
       O primeiro envio dispara um e-mail de confirmação para esse endereço.
       --------------------------------------------------------- */
    var form = document.getElementById('form-contato');
    if (form) {
        var status = document.getElementById('form-status');
        var botaoEnviar = form.querySelector('button[type="submit"]');
        var armadilha = form.querySelector('[name="_honey"]');
        var textoBotao = botaoEnviar ? botaoEnviar.textContent : '';
        var timerCarimbo = 0;

        var avisar = function (texto, tipo) {
            status.textContent = texto;
            if (tipo) status.setAttribute('data-tipo', tipo); else status.removeAttribute('data-tipo');
        };

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.reportValidity(); return; }

            // robôs preenchem o campo escondido: finge sucesso e descarta
            if (armadilha && armadilha.value) { avisar('Carta enviada!', 'ok'); form.reset(); return; }

            var destino = (form.getAttribute('data-destino') || '').trim();
            if (!destino) {
                avisar('O envio não está disponível no momento.', 'erro');
                if (window.console) console.warn('Formulário: preencha data-destino em #form-contato com o e-mail que receberá as mensagens.');
                return;
            }

            var dados = {
                name: form.elements['name'].value.trim(),
                email: form.elements['email'].value.trim(),
                message: form.elements['message'].value.trim(),
                _subject: 'Novo contato pelo portfólio',
                _template: 'table',
                _captcha: 'false'
            };

            botaoEnviar.disabled = true;
            botaoEnviar.textContent = 'Enviando…';
            avisar('Enviando a sua carta…');
            form.classList.remove('enviado');

            fetch('https://formsubmit.co/ajax/' + encodeURI(destino), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(dados)
            })
                .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
                .then(function (res) {
                    var sucesso = res.ok && (res.j.success === true || res.j.success === 'true');
                    if (!sucesso) throw new Error((res.j && res.j.message) || 'falha');
                    form.reset();
                    form.classList.add('enviado');
                    avisar('Carta enviada! Respondo assim que possível.', 'ok');
                    window.clearTimeout(timerCarimbo);
                    timerCarimbo = window.setTimeout(function () { form.classList.remove('enviado'); }, 4200);
                })
                .catch(function (err) {
                    if (window.console) console.warn('Formulário:', err && err.message);
                    avisar('Não foi possível enviar agora. Tente novamente em instantes.', 'erro');
                })
                .then(function () {
                    botaoEnviar.disabled = false;
                    botaoEnviar.textContent = textoBotao;
                });
        });

        // ao voltar a digitar, limpa a mensagem de erro anterior
        form.addEventListener('input', function () {
            if (status.getAttribute('data-tipo') === 'erro') avisar('');
        });
    }
})();
