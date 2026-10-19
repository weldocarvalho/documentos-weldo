// Inicialização do estado nativo da interface do smartphone
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    const app = document.getElementById('appInterface');
    app.innerHTML = `
        <div class="ai-orb">AI</div>
        <div>
            <p class="app-title">Módulo de Visão Ativo</p>
            <p class="app-subtitle">Aguardando comando de escaneamento externo.</p>
        </div>
    `;
}

function startAnalysis() {
    const app = document.getElementById('appInterface');
    app.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // DISPARO META ADS: Rastreia a intenção inicial de compra/análise
    if (typeof fbq === 'function') {
        fbq('track', 'InitiateCheckout', { content_name: 'Botao_Escanear_Hero' });
    }

    // ESTADO 1: Simulação visual do processamento da rede neural (Carregamento)
    app.innerHTML = `
        <div class="camera-box">
            <div class="scan-line"></div>
            <div class="spinner"></div>
        </div>
        <div>
            <p class="pulse-text">Mapeando Rosto...</p>
            <p class="app-subtitle" style="margin-top: 4px;">Alocando GPU em nuvem (AWS-SA1)...</p>
        </div>
    `;

    // ESTADO 2: Disparo do erro estratégico após 2.8 segundos
    setTimeout(() => {
        app.innerHTML = `
            <div class="error-icon">
                <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 48px; height: 48px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            </div>
            <div>
                <p class="app-title" style="color: #f59e0b;">Alta Demanda de IA</p>
                <p class="error-desc">Atingimos o limite temporário de hardware devido ao volume de acessos. Reserve seu slot gratuito na fila de processamento:</p>
            </div>
            <form id="leadForm" onsubmit="executeLeadCapture(event)" class="lead-form">
                <input type="email" id="leadEmail" required placeholder="Digite seu melhor e-mail" class="input-field">
                <button type="submit" class="btn-submit">Garantir Meu Acesso VIP Grátis</button>
            </form>
        `;
    }, 2800);
}

function executeLeadCapture(event) {
    event.preventDefault();
    const email = document.getElementById('leadEmail').value;
    const app = document.getElementById('appInterface');

    // DISPARO META ADS: Rastreia a conversão final do Smoke Test (Lead qualificado)
    if (typeof fbq === 'function') {
        fbq('track', 'Lead', { content_category: 'Lista_VIP_Skincare' });
    }

    console.log("SMOKE TEST VALIDADO -> Lead Ativo:", email);

    // ESTADO 3: Retenção com mensagem de sucesso
    app.innerHTML = `
        <div class="success-icon">
            <svg xmlns="http://w3.org" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width: 48px; height: 48px;"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
        </div>
        <div>
            <p class="app-title" style="color: #10b981;">Posição Garantida!</p>
            <p class="app-subtitle" style="line-height: 1.4; margin-top: 6px;">Seu e-mail foi inserido na nossa fila de prioridade. Enviaremos seu convite exclusivo assim que novos slots de IA forem liberados.</p>
        </div>
    `;
}

