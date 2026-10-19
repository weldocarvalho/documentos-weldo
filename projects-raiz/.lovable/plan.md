# Plano: registrar decisões operacionais sobre execução paralela

Sem mudança de código. Só ajustes em `docs/BACKLOG.md` e `docs/CONTRIBUTING.md` pra refletir as 3 decisões tomadas agora.

## 1. `docs/BACKLOG.md`

**(a) Nova seção no topo: "Convenções de execução paralela"**
- Onde = `Lovable` → implementado direto no editor Lovable.
- Onde = `IDE` → executado no Cursor/Claude Code, entregue como **PR no GitHub** contra a branch default do repo conectado.
- Onde = `Lovable + IDE` → preparação no IDE (lógica/refactor), commit final no Lovable (preview visual).
- Toda tarefa IDE deve abrir PR com: descrição linkando ID da tarefa (ex.: T-RES3), checklist de aceite copiada da tarefa, testes quando o critério exigir.

**(b) T-PERF1 — marcar status "pronto pra IDE agora"**
- Adicionar linha `**Status:** ▶️ Em execução paralela (IDE)` no bloco da tarefa.
- Manter `Onde: IDE` como está.
- Nota: relatório final entregue como PR adicionando `docs/investigations/2026-06-13-perf-cold-load.md` (read-only, sem mudança de código de app).

**(c) Adicionar T-DOC1 — Sweep de termos obsoletos (formal no backlog)**
Novo bloco numa seção "M0 — Documentação contínua" (criar se não existir, senão no fim do arquivo antes da seção de Removidos):

```
### T-DOC1 — Sweep de termos obsoletos pós-pivot de pricing/MVP
**Milestone:** M0 · **Onde:** IDE · **Estimativa:** S
**Contexto:** Pivot de 2026-06-13 mudou pricing, trial e escopo de MVP. Pode ter resíduo em /docs, README, CHANGELOG e comentários de código.
**Critério de aceite:**
- [ ] Buscar e revisar ocorrências de: "anual", "R$ 119,90", "R$ 14,90", "trial 7 dias" / "7-day", "M3", "M8", "M4.3", "refine-routine como gancho premium", "inglês"/"english"/"i18n"
- [ ] Em cada hit: corrigir, remover ou marcar como histórico (se referência a decisão antiga)
- [ ] ADRs antigas NÃO são reescritas — apenas anotadas como superseded quando aplicável
- [ ] Entregue como 1 PR único intitulado "docs: sweep pós-pivot MVP (T-DOC1)"
**Fora do escopo:** mudança de regras de negócio (já consolidadas em BR-* e ADRs 0010/0011).
**Arquivos prováveis:** `docs/**`, `README.md`, `CHANGELOG.md` (se existir), comentários em `src/components/site/PricingPlans.tsx` e `src/lib/onboarding.functions.ts`.
```

## 2. `docs/CONTRIBUTING.md`

Adicionar (ou criar se ausente) uma subseção curta "Trabalho paralelo Lovable ↔ IDE" com:
- Repo GitHub conectado é a fonte de verdade do código; sync é bidirecional.
- IDE abre PR; merge dispara sync de volta pro Lovable automaticamente.
- Antes de pegar tarefa IDE: confirmar que nenhuma tarefa Lovable em andamento toca os mesmos arquivos (campo "Arquivos prováveis" do backlog serve como sinal de conflito).
- Ordem recomendada atual (Jun/2026): IDE pega T-DOC1 → T-RES3 → T-RES2 → T-PERF1; Lovable segue com T-PAY1 → T-PAY2 → T-LP1.

## Fora do escopo deste plano

- Não criar produtos no Paddle ainda (aguardando confirmação do usuário já dada, mas execução fica pra próxima rodada).
- Não tocar em código de app.
- Não criar ADR nova — essas são convenções operacionais, vivem em CONTRIBUTING.

## Resultado

Após implementar: backlog tem T-DOC1 catalogada, T-PERF1 sinalizada como em execução paralela, e CONTRIBUTING documenta o fluxo PR-based pra qualquer IA/dev que entrar no projeto saber como entregar.
