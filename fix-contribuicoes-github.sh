#!/bin/bash
set -e

# ============================================================
# Corrige o email de autor dos commits recentes (weldodf@gmail.com
# -> weldocarvalho@outlook.com, que já está verificado no GitHub)
# na branch "development" do repositório zion-skincare
# (skinmap-ia-assistant), e reenvia o histórico corrigido.
#
# Por que isso é necessário:
#   - weldodf@gmail.com NÃO está verificado na sua conta GitHub
#   - Por isso os 75 commits feitos entre 25/jul e hoje (23/ago)
#     nessa branch não estão sendo contados no gráfico de contribuições
#
# O que este script faz:
#   1. Remove o lock de git travado (deixado pela minha tentativa
#      anterior via bridge remota — não consegui removê-lo de lá)
#   2. Guarda suas mudanças não commitadas (stash) para não perdê-las
#   3. Reescreve o autor/committer dos 75 commits afetados
#   4. Mostra o resultado para você conferir ANTES de enviar
#   5. Envia (force-push) a branch corrigida para o GitHub
#   6. Restaura suas mudanças não commitadas
#
# Segurança: já criei uma branch de backup local chamada
# "development-backup-before-email-fix" apontando para o estado
# ORIGINAL, antes de qualquer alteração. Se algo der errado, você
# pode voltar com:
#   git checkout development
#   git reset --hard development-backup-before-email-fix
# ============================================================

REPO_DIR="$HOME/Documents/projects/belter-oracle/zion-skincare"
OLD_EMAIL="weldodf@gmail.com"
NEW_EMAIL="weldocarvalho@outlook.com"
NEW_NAME="weldo.carvalho"
RANGE_START="4e5470e"   # commit imediatamente ANTES do primeiro commit com email errado

cd "$REPO_DIR"

echo "==> 0. Removendo lock de git travado (se existir)..."
rm -f .git/index.lock

echo "==> 1. Corrigindo o email e o nome local deste repositório para não repetir o problema..."
git config user.email "$NEW_EMAIL"
git config user.name "$NEW_NAME"

echo "==> 2. Guardando mudanças não commitadas (stash)..."
git status --short
git stash push -m "wip-antes-da-correcao-de-email" || echo "(nada para guardar, ok)"

echo "==> 3. Indo para a branch development..."
git checkout development

echo "==> 4. Reescrevendo autor/committer dos commits afetados..."
git filter-branch -f --env-filter '
if [ "$GIT_COMMITTER_EMAIL" = "'"$OLD_EMAIL"'" ]; then
    export GIT_COMMITTER_EMAIL="'"$NEW_EMAIL"'"
fi
if [ "$GIT_AUTHOR_EMAIL" = "'"$OLD_EMAIL"'" ]; then
    export GIT_AUTHOR_EMAIL="'"$NEW_EMAIL"'"
fi
' "$RANGE_START"..development

echo ""
echo "==> 5. Confira o resultado abaixo (todos devem mostrar $NEW_EMAIL):"
git log development --pretty=format:'%h  %ae  %s' | head -20
echo ""
echo ""
read -p "Os commits acima estão corretos? Digite 'sim' para enviar ao GitHub (force-push): " CONFIRM

if [ "$CONFIRM" = "sim" ]; then
    echo "==> 6. Enviando ao GitHub..."
    git push --force-with-lease origin development
    echo "==> Pronto! Os commits devem aparecer no seu gráfico de contribuições em alguns minutos."
else
    echo "Cancelado. Nada foi enviado ao GitHub. Sua branch local development já está reescrita;"
    echo "para desfazer: git reset --hard development-backup-before-email-fix"
fi

echo "==> 7. Restaurando suas mudanças não commitadas..."
git stash pop || echo "(nenhum stash para restaurar)"

echo ""
echo "Concluído."
