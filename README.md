# ⚽ Championship Manager - Pelada Vip Master

Gerenciador de campeonato de futebol com 6 seleções mundiais — fase de grupos, semifinais e final.

## Times

| Grupo A | Grupo B |
|---------|---------|
| 🇩🇪 Alemanha | 🇫🇷 França |
| 🇦🇷 Argentina | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra |
| 🇪🇸 Espanha | 🇵🇹 Portugal |

## Regras

- **Fase de grupos**: Round-robin (todos contra todos no grupo)
- **Classificação**: Pontos → Saldo de Gols → Gols Marcados → Gols Sofridos
- **Os 2 primeiros** de cada grupo avançam às semifinais
- **Semifinais**: 1º Grupo A × 2º Grupo B | 1º Grupo B × 2º Grupo A
- **Final**: Vencedores das semis
- **Empate em eliminatórias**: Decide nos pênaltis
- **Dados**: Salvos no `localStorage` do navegador

## Tecnologia

- HTML5 + CSS3 (Vanilla) + JavaScript ES2022 Modules
- Zero dependências externas
- Deploy: Vercel (static site)

## Deploy

### GitHub
```bash
git init
git add .
git commit -m "feat: initial championship manager"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/football-championship.git
git push -u origin main
```

### Vercel
1. Acesse [vercel.com/new](https://vercel.com/new)
2. Importe o repositório `football-championship`
3. Sem configurações extras — o `vercel.json` já configura tudo
4. Clique em **Deploy**

Após isso, qualquer `git push main` faz deploy automático. ✅

## Desenvolvimento local

Qualquer servidor HTTP estático funciona:

```bash
# Python
python3 -m http.server 3000

# Node (npx)
npx -y serve .
```

Abra `http://localhost:3000` no navegador.

---

> Dados salvos localmente no navegador. Nenhum servidor necessário.
