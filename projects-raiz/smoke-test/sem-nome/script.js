/**
 * SKINMETRICS.AI — MOTOR DE ESTADOS DA INTERFACE NATIVA (MODULAR - PARTE 1)
 * Foco: Auditoria de Eficácia e Retenção Financeira de Skincare
 */

// Dicionário de estados globais para o aplicativo
const APP_STATES = {
    INIT: 'INIT',
    SCANNING: 'SCANNING',
    ERROR: 'ERROR',
    SUCCESS: 'SUCCESS'
};

document.addEventListener("DOMContentLoaded", () => {
    injectDynamicStyles();
    renderState(APP_STATES.INIT);
});

/**
 * Injeta estilos dinâmicos complexos para evitar inchaço no style.css global
 */
function injectDynamicStyles() {
    if (document.getElementById('app-dynamic-styles')) return;
    const style = document.createElement('style');
    style.id = 'app-dynamic-styles';
    style.innerHTML = `
        .chart-preview-box { width: 100%; display: flex; flex-direction: column; gap: 8px; margin-top: 12px; opacity: 0.7; }
        .chart-row { display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: #64748b; }
        .chart-bar-bg { width: 60%; height: 6px; background: #1e293b; border-radius: 3px; overflow: hidden; }
        .chart-bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8); width: 0%; transition: width 1s ease; }
        .scan-terminal { width: 100%; background: #090d16; border: 1px solid #1e293b; border-radius: 8px; padding: 10px; font-family: monospace; text-align: left; margin-top: 8px; box-sizing: border-box; }
        .terminal-line { font-size: 9px; color: #38bdf8; line-height: 1.4; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .terminal-line.success { color: #34d399; }
    `;
    document.head.appendChild(style);
}

/**
 * Gerenciador centralizado de renderização de telas
 * @param {string} state - Estado vindo do objeto APP_STATES
 */
function renderState(state) {
    const app = document.getElementById('appInterface');
    if (!app) return;

    switch (state) {
        case APP_STATES.INIT:
            app.innerHTML = `
                <div class="ai-orb" style="border-style: solid; border-color: rgba(99,102,241,0.4); box-shadow: 0 0 15px rgba(99,102,241,0.2);">Data</div>
                <div style="width: 100%;">
                    <p class="app-title" style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Auditor de Eficácia V1.0</p>
                    <p class="app-subtitle" style="margin-bottom: 12px;">Pronto para analisar o desperdício financeiro da sua rotina.</p>
                </div>
                <div class="chart-preview-box">
                    <div class="chart-row"><span>Poros Obstruídos</span><div class="chart-bar-bg"><div class="chart-bar-fill" id="b1"></div></div></div>
                    <div class="chart-row"><span>Eficácia de Ativos</span><div class="chart-bar-bg"><div class="chart-bar-fill" id="b2"></div></div></div>
                </div>
            `;
            // Efeito visual de microinteração nos gráficos falsos de fundo
            setTimeout(() => {
                if(document.getElementById('b1')) document.getElementById('b1').style.width = '78%';
                if(document.getElementById('b2')) document.getElementById('b2').style.width = '42%';
            }, 300);
            break;

        case APP_STATES.SCANNING:
            app.innerHTML = `
                <div class="camera-box" style="border-color: #4f46e5; box-shadow: 0 0 20px rgba(79,70,229,0.3);">
                    <div class="scan-line"></div>
                    <div class="spinner"></div>
                </div>
                <div style="width: 100%;">
                    <p class="pulse-text" style="color: #818cf8; font-size: 11px;">Cruzando Histórico Dérmico...</p>
                    <div class="scan-terminal">
                        <div class="terminal-line">> Inicializando pipeline de Visão Computacional...</div>
                        <div class="terminal-line" id="term-2">> Alocando nós de GPU (AWS-SA1)...</div>
                        <div class="terminal-line success" id="term-3" style="display:none">> Mapeando 12 bio-indicadores faciais...</div>
                    </div>
                </div>
            `;
            
            // Simulação de Logs de Linha de Comando (Gera altíssimo valor percebido)
            setTimeout(() => { 
                const t2 = document.getElementById('term-2');
                if(t2) t2.innerText = '> Conectado à AWS-SA1. Latência: 14ms.';
            }, 1200);
            
            setTimeout(() => {
                const t3 = document.getElementById('term-3');
                if(t3) t3.style.display = 'block';
            }, 2000);
            break;
    }
}

/**
 * Função de Gatilho Principal (Disparada pelo botão da Landing Page)
 */
function startAnalysis() {
    const app = document.getElementById('appInterface');
    if (!app) return;
    
    app.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // EXECUÇÃO DE DATA-LAYER: Rastreamento da intenção de auditoria
    if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', { 
            content_name: 'Desafio_Auditoria_Rotina',
            content_category: 'Skincare_Eficacia'
        });
    }

    // Altera o container do smartphone para o modo processamento de IA
    renderState(APP_STATES.SCANNING);

    // O encapsulamento do Estado de Erro Estratégico (Fila VIP) virá no Módulo 2 do chat
    if (typeof triggerNextStatePipeline === 'function') {
        triggerNextStatePipeline();
    }
}

/**
 * SKINMETRICS.AI — MOTOR DE ESTADOS DA INTERFACE NATIVA (MODULAR - PARTE 2)
 * Foco: Pipeline de Escassez e Captura de Leads Qualificados
 */

/**
 * Pipeline assíncrono que gerencia a transição para o erro de hardware e formulário
 */
function triggerNextStatePipeline() {
    // ESTADO 2: Disparo do erro estratégico após 2.8 segundos de simulação
    setTimeout(() => {
        const app = document.getElementById('appInterface');
        if (!app) return;

        app.innerHTML = `
            <div class="error-icon" style="color: #f59e0b; margin-bottom: 8px;">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 44px; height: 44px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
            </div>
            <div style="width: 100%; padding: 0 4px;">
                <p class="app-title" style="color: #f59e0b; font-size: 13px;">Capacidade Excedida</p>
                <p class="error-desc" style="font-size: 11px; margin-bottom: 12px; color: #94a3b8; line-height: 1.4;">
                    Para manter a precisão científica dos relatórios de eficácia, limitamos o processamento gráfico de novos usuários. Não gaste dinheiro às cegas com cosméticos. Entre na fila de auditoria gratuita:
                </p>
            </div>
            <form id="leadForm" onsubmit="executeLeadCapture(event)" class="lead-form" style="width: 100%;">
                <input type="email" id="leadEmail" required placeholder="Seu melhor e-mail corporativo ou pessoal" class="input-field" style="box-sizing: border-box;">
                <button type="submit" class="btn-submit" style="background: #4f46e5; transition: background 0.2s;">Garantir Minha Vaga no Lote Beta</button>
            </form>
        `;
    }, 2800);
}

/**
 * Processa o envio do formulário, dispara tags de Growth e renderiza o sucesso
 * @param {Event} event - Evento nativo do formulário
 */
function executeLeadCapture(event) {
    event.preventDefault();
    
    const emailInput = document.getElementById('leadEmail');
    const app = document.getElementById('appInterface');
    if (!emailInput || !app) return;

    const email = emailInput.value;

    // DATA LAYER ADS: Rastreia a conversão final do lead qualificado em Auditoria
    if (typeof fbq === 'function') {
        fbq('track', 'Lead', { 
            content_category: 'Lista_VIP_Auditoria_Skincare',
            value: 0.00,
            currency: 'BRL'
        });
    }

    // Console log estratégico para depuração de Growth hacking no navegador
    console.log("🔥 [SMOKE TEST VALIDADO] Lead de Alta Intenção Capturado:", email);

    // ESTADO 3: Retenção máxima com mensagem de sucesso e autoridade técnica
    app.innerHTML = `
        <div class="success-icon" style="color: #10b981; margin-bottom: 12px;">
            <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 44px; height: 44px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        </div>
        <div style="width: 100%; padding: 0 4px;">
            <p class="app-title" style="color: #10b981; font-size: 13px;">Vaga Reservada!</p>
            <p class="app-subtitle" style="line-height: 1.5; font-size: 11px; color: #94a3b8; margin-top: 6px;">
                Identificador de Fila ativado para o seu e-mail. Você receberá um alerta assim que nossos servidores liberarem o seu slot de processamento para auditar seus produtos.
            </p>
        </div>
    `;
}
