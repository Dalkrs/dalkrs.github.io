#!/usr/bin/env python3
"""(lote 185) As habilidades agem no mapa.

Lê as árvores (a saída da forja, igual à biblioteca da mesa) e escreve tc/habs-acoes.js: para cada habilidade que gasta
barra (ativa, reação, ritual), e para cada nível dela, o que ela faz nas Cenas:

  m   como mira: 'si' (em você), 'volta' (área em volta de você), 'alvo' (clica num token), 'ponto' (clica num lugar)
  al  alcance em cédulas (a partir de quem usa)
  f   forma da área: 'circ', 'cone', 'line'      r  tamanho da área em cédulas
  q   quem a área pega: 'i' inimigos, 'a' aliados, 't' todos       mx  no máximo quantos alvos
  z   zona que fica no chão: { fx, t (turnos) }
  inv invocação: { nome, cor, tam, vida, t, n }  ou  { clone: true, n, t }  (as cópias do personagem)
  c   condições: [[id, turnos, teste, 'a' (no alvo) | 's' (em você)]]  teste: 'vigor' | 'candes' | 'CAN' | 'VIT' …
  mv  mover: { k: 'empurra' | 'puxa' | 'salta' | 'troca', d }
  d   tier do Dano (1 a 5)      cu  tier da Cura (1 a 5)

O texto é lido por regras (abaixo). O que a regra não pega, a janela "Resolver" das Cenas mostra com o texto da
habilidade, e o mestre ajusta na hora. O mapa antigo do painel (def.mapa, por nome) entra por cima, quando existe.

Uso: python3 src/habs/gerar_acoes.py /home/claude/forja/saida.json /tmp/mapa_antigo.json
"""
import json, re, sys, os

ROM = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5}
NUM = {'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3, 'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9, 'dez': 10}
NUMW = r'(\d+|um|uma|dois|duas|três|quatro|cinco|seis|sete|oito|nove|dez)'
num = lambda s: int(s) if s.isdigit() else NUM.get(s.lower(), 1)

# ---------- condições: (regex no texto, id da condição no site, o padrão de quem recebe) ----------
CONDS = [
  (r'\bderrub|\bo alvo cai\b|\bcai(?:em)? no chão|\bcaem\b|\bcai \(|\bcai,|\bfica caíd|\b(?:e|o alvo|ele) cai\b', 'caido'),
  (r'\bpres[oa]s?\b|\bprende|\benraiz|não anda|\bimobiliz|\bfica no fundo', 'preso'),
  (r'\batordo|perde o (?:próximo )?turno|perde a vez', 'atordoado'),
  (r'\bsangramento|\bsangra\b|\bsangrando', 'sangue'),
  (r'\benvenen|\bveneno (?:entra|do corpo)|\bpeçonha', 'veneno'),
  (r'\bqueima(?:ndo|m|r)?\b|\bpega fogo|\bem chamas\b', 'fogo'),
  (r'\bcongela(?:d[oa]s?)? (?:o|um|uma|os|quem|o alvo|inimigos|todos)\b|\bfica(?:m)? congelad', 'gelo'),
  (r'\bfica cego|\bficam cegos|\bcega\b|\bcegueira|\bofusca', 'cego'),
  (r'\bamedront|\bmedo\b|\bfoge(?:m)? de medo', 'medo'),
  (r'\babalad', 'abalado'),
  (r'\bdorme|\bdormem|\badormec', 'adormecido'),
  (r'\bsonolent', 'sonolento'),
  (r'\bconfus', 'confuso'),
  (r'\benfeiti|\bencantad', 'enfeiticado'),
  (r'\bsilenci', 'silencio'),
  (r'\bamaldiçoad|\bmaldição\b', 'maldicao'),
  (r'\bmarcad|\bmarca (?:um|o|uma|dois|até)', 'marcado'),
  (r'\bdistraíd|\bdistrai\b', 'distraido'),
  (r'\bexpost', 'exposto'),
  (r'(?<!sem )\bprovoca(?!r ataque)', 'provocado'),
  (r'\bdesarma', 'desarmado'),
  (r'\blent[oa]s?\b|metade do movimento|\bandam? (?:só )?metade', 'lento'),
  (r'\bescolhid', 'escolhido'),
  (r'\bo protegido\b|\bseu protegido|\bvira (?:o )?(?:seu )?protegido|\bfica protegid[oa] (?:por|pel)', 'protegido'),
]
# o que é em você (ou no aliado): só quando o texto fala de você
CONDS_SI = [
  (r'\bfica(?:m)? escondid|\bfica(?:m)? invisív|\bsome da vista|\bvocê some\b', 'escondido'),
  (r'\bvocê voa\b|\bvoa por\b|\bfica voando|\bvoa livre', 'voando'),
  (r'\bregenera|\bcura tier [IV]+ por turno|\bcura .{0,20} no começo', 'regen'),
]

FX_PALAVRAS = [
  (r'fumaça', 'fumaca'), (r'névoa (?:de|que) (?:veneno|tóxic)|gás|nuvem verde|nuvem tóxica|fumaça amarela', 'toxica'), (r'escur(?:o|idão|ece)|breu|trevas', 'escuridao'),
  (r'névoa', 'nevoa'), (r'teia|rede', 'teia'), (r'óleo', 'oleo'), (r'lama|chão mole|atoleiro', 'lama'), (r'gelo|congel|neve', 'gelado'),
  (r'brasa', 'brasas'), (r'fogo|chama|incêndio', 'fogo'), (r'vento|tornado|redemoinho|ciclone', 'vento'), (r'raio|trovão|tempestade', 'tempestade'),
  (r'espinho|estaca', 'chaoEspinhos'), (r'raiz|raízes|cipó|planta|vinha', 'raizesNirus'), (r'parede de luz|barreira|escudo de|cúpula', 'barreira'),
  (r'muro|muralha|parede', 'muralhaNatu'), (r'luz|sol\b|sagrad|bênção', 'sagrado'), (r'cura|fonte', 'cura'), (r'sombra', 'sombra'),
  (r'silêncio', 'silencio'), (r'esporo|pólen|pó\b', 'esporos'), (r'runa|selo|círculo', 'runas'), (r'armadilha|laço|fosso|mina', 'chaoEspinhos'),
  (r'terra|tremor|terremoto|chão', 'terra'), (r'água|onda', 'correnteza'), (r'ácid', 'acida'), (r'maldi', 'maldicao'), (r'espírito|alma', 'espiritos'),
  (r'sangue', 'luaSangue'), (r'gravidade|peso', 'gravidade'), (r'tempo', 'tempo'),
]

INVOC = [  # (regex, nome, cor, tam, vida)
  (r'\bclones?\b|cópias? de você|sombras? idêntic', None, None, 1, 0),
  (r'\blob(?:o|os)\b', 'Lobo', '#8A8070', 1, 5),
  (r'\besqueleto', 'Esqueleto', '#D8D2C4', 1, 4),
  (r'\bzumbi', 'Zumbi', '#6F7F5A', 1, 8),
  (r'\bmorto-vivo|\bmortos-vivos|\blevanta (?:um|o|os) (?:morto|cad)', 'Morto-vivo', '#9A9484', 1, 6),
  (r'\bárvore viva|\buma árvore', 'Árvore', '#3F7A46', 1, 10),
  (r'\btorreta', 'Torreta', '#8A7A4A', 0.5, 5),
  (r'\bimp\b', 'Imp', '#8E3B3B', 0.5, 3),
  (r'\bdemônio', 'Demônio', '#6E2A2A', 1, 8),
  (r'\bespírito', 'Espírito', '#9FB8E0', 1, 4),
  (r'\bfera\b|\bcompanheiro', 'Fera', '#8B6B4A', 1, 10),
  (r'\bcorvo|\bave\b|\bfalcão', 'Ave', '#5A5A6A', 0.5, 2),
  (r'\bgolem', 'Golem', '#7A7A6A', 1, 12),
  (r'\bservo', 'Servo', '#7A6A70', 1, 5),
  (r'\brei antigo|\brei-sem-coroa', 'Rei antigo', '#B8A86A', 1, 20),
  (r'\bsol pequeno', 'Sol pequeno', '#E0C060', 0.5, 0),
  (r'\bbandeira|\bestandarte', 'Bandeira', '#D9B44A', 0.5, 0),
  (r'\bboneco|\bespantalho|\bisca\b', 'Isca', '#A08A6A', 1, 3),
  (r'\bengenhoca|\baranha', 'Engenhoca', '#6A6A6A', 0.5, 3),
]

def turnos(t):
    m = re.search(r'por ' + NUMW + r' turnos?', t, re.I)
    if m: return num(m.group(1))
    if re.search(r'até o fim do (?:seu )?próximo turno|no próximo turno|por 1 turno', t, re.I): return 1
    if re.search(r'até o fim da luta', t, re.I): return 10
    return None

def teste(t):
    m = re.search(r'teste de (Vigor|CAN ou DES|DES ou CAN|CAN|DES|VIT|FOR|AGI)', t)
    if m:
        k = m.group(1)
        return 'vigor' if k == 'Vigor' else 'candes' if 'ou' in k else k
    m = re.search(r'testa(?:m)? (Vigor|CAN ou DES|DES ou CAN|CAN|DES|VIT|FOR|AGI)', t)
    if m:
        k = m.group(1)
        return 'vigor' if k == 'Vigor' else 'candes' if 'ou' in k else k
    return None

def tier(pal, t):
    m = re.search(pal + r' tier (V|IV|III|II|I)\b', t)
    return ROM[m.group(1)] if m else None

def alcance(t):
    m = re.search(r'(?:a até|até|a) ' + NUMW + r' cédulas?', t)
    if m: return num(m.group(1))
    if re.search(r'à vista|alcance ilimitado|o campo inteiro', t): return 30
    if re.search(r'colad|corpo a corpo|\btoque|\btoca\b|\bmordida|\bgolpe\b|\bsoco|\bchute|\bagarra', t, re.I): return 1
    if re.search(r'tiro|flecha|atira|arremess|virote|kunai|lança|dardo|agulha|disparo|projétil|bola de', t, re.I): return 8
    return None

def ler(t, nome, base):
    """O que o texto de um nível diz. `base`: o do nível anterior (o que este não diz, herda)."""
    s = dict(base or {})
    tl = t.lower()
    d = tier('Dano', t); cu = tier('Cura', t) or tier('cura', t) or (lambda m: ROM[m.group(1)] if m else None)(re.search(r'curam? tier (V|IV|III|II|I)\b', t))
    if d: s['d'] = d
    if cu: s['cu'] = cu
    # em linha de "Dano tier III." puro (o nível 2): só o número muda
    so_num = bool(re.fullmatch(r'\s*(?:E |Com )?(?:Dano|Cura|Defesa)[^.]{0,30}\.?\s*', t)) and base
    if so_num: return s
    al = alcance(t)
    # o nível 2 que só muda um detalhe ("Dois clones.", "E o alvo fica Marcado.") fica com a mira do nível 1
    herda = bool(base) and al is None and len(t) < 90 and not re.search(r'área|raio|círculo|cone|linha|parede|muro|em volta', tl)
    plural = re.search(r'\b(inimigos|aliados|todos|quem estiver|cada inimigo|cada aliado|os seres|todo inimigo|todo aliado)\b', tl)
    area = re.search(r'(?:área|raio|círculo|cúpula) de ' + NUMW + r' cédulas?', tl)
    cone = re.search(r'\bcone\b(?: de ' + NUMW + r')?', tl)
    linha = re.search(r'\b(?:em linha|uma linha|linha de|parede de|muro de|muralha de|corredor de)\s*' + NUMW + r'?', tl)
    if 'q' not in s or not base:
        s['q'] = 'a' if re.search(r'\baliad', tl) and not re.search(r'\binimig', tl) else 'i' if re.search(r'\binimig', tl) else 't'
    mx = re.search(r'até ' + NUMW + r' (?:inimigos|aliados|alvos)', tl)
    if mx: s['mx'] = num(mx.group(1))
    # a forma e de onde ela sai
    if cone:
        s.update(m='ponto', f='cone', r=num(cone.group(1)) if cone.group(1) else (al or 3), al=0)
    elif linha and re.search(r'parede|muro|muralha|corredor', tl):
        s.update(m='ponto', f='line', r=num(linha.group(1)) if linha.group(1) else 3, al=al or 6)
    elif linha:
        s.update(m='ponto', f='line', r=num(linha.group(1)) if linha.group(1) else (al or 6), al=0)
    elif re.search(r'a ' + NUMW + r' cédulas? do ponto', tl):
        s.update(m='ponto', f='circ', r=num(re.search(r'a ' + NUMW + r' cédulas? do ponto', tl).group(1)), al=al if al and al > 2 else 6)
    elif plural and re.search(r'(?:todos|todo|os)? ?(?:os )?(?:inimigos|aliados) à vista|todos à vista', tl):
        s.update(m='volta', f='circ', r=30, al=0)
    elif area:
        r = num(area.group(1))
        centro_si = re.search(r'em volta de você|à sua volta|ao seu redor|em volta\b', tl) and not al
        s.update(m='volta' if centro_si else 'ponto', f='circ', r=r, al=0 if centro_si else (al if al and al != r else 6))
    elif plural and al and re.search(r'\b(?:inimigos|aliados|todos|todo inimigo|todo aliado|cada inimigo|cada aliado) (?:a|que estiverem a|que começarem o turno a|a até) ' + NUMW + r' cédulas?', tl):
        s.update(m='volta', f='circ', r=al, al=0)
    elif re.search(r'\b(?:inimigos|aliados) colados|quem estiver colado|todos colados', tl):
        s.update(m='volta', f='circ', r=1, al=0)
    elif re.search(r'\b(?:um|o|num|uma|a) (?:alvo|inimigo|aliado|ser|criatura|morto-vivo seu)|\bo alvo\b|\bnum alvo|\bum ser\b|\bem quem\b', tl) or (s.get('d') and not plural):
        s.update(m='alvo', al=al or 1)
    elif re.search(r'\b(anda|salta|corre|pula|teleporta|aparece|atravessa|avança|recua|dispara até)\b', tl):
        s.update(m='ponto', al=al or 4)
    else:
        s.setdefault('m', 'si')
    if herda:
        for k in ('m', 'al', 'f', 'r', 'q', 'mx'):
            if k in base: s[k] = base[k]
    # zona no chão: área + duração, ou parede/muro
    tt = turnos(t)
    if s.get('f') and (tt or re.search(r'parede|muro|muralha|armadilha|fosso|laço|mina\b', tl)):
        fx = next((v for p, v in FX_PALAVRAS if re.search(p, tl)), None)
        if fx: s['z'] = {'fx': fx, 't': tt or (10 if re.search(r'armadilha|laço|fosso|mina\b', tl) else 2)}
    elif re.search(r'\b(?:arma|monta|cria|abre|planta|finca) (?:um|uma|o|a)? ?(?:armadilha|laço|fosso|mina|totem|círculo|selo)', tl):
        fx = next((v for p, v in FX_PALAVRAS if re.search(p, tl)), 'runas')
        s.update(m='ponto', f='circ', r=0.5 if not re.search(r'fosso de ' + NUMW, tl) else 1, al=s.get('al') or 3)
        s['z'] = {'fx': fx, 't': tt or 10}
    # invocação
    for p, nm, cor, tam, vida in INVOC:
        mm = re.search(p, tl)
        if not mm: continue
        if re.search(r'^\s*(?:seu|seus|sua|suas)\b', tl[mm.end():mm.end() + 8]) or re.search(r'(?:seu|seus|sua|suas|os seus|cada) $', tl[max(0, mm.start() - 9):mm.start()]):
            break   # fala de um que já existe ("um morto-vivo seu explode")
        if re.search(r'expuls|consert|desmont|\bdoma|destr[oó]i|\bbane|afasta|contra (?:mortos|morto|espírito|demônio)|\bem (?:mortos|espíritos)', tl):
            break   # mexe num que já existe (expulsar, consertar, domar)
        if re.search(r'\b(?:a|o|as|os|sua|seu|à|ao|da|do|na|no) $', tl[max(0, mm.start() - 4):mm.start()]) and not re.search(r'levanta|invoca|chama|aparece|surge|cria|ergue|nasce|brota|monta|planta|finca', tl):
            break   # "você e a fera": a que já está na cena
        if re.search(r'\bvira (?:o |a |um |uma |meia )?$', tl[max(0, mm.start() - 12):mm.start()]):
            break   # vira a fera: é você que muda (Transformado), não um token novo
        if not re.search(r'levanta|invoca|chama|aparece|aparecem|surge|surgem|lutam?\b|cria|ergue|nasce|brota|monta|planta|finca|\b(?:um|uma|dois|duas|três|quatro|cinco|seis) ' + re.escape(mm.group(0).strip()[:5]), tl):
            continue
        n = 1
        mn = re.search(NUMW + r' (?:' + p.strip('\\b').split('|')[0].replace('(?:', '').replace(')', '').replace('\\b', '') + r')', tl)
        mn2 = re.search(r'\b' + NUMW + r' (?:clones?|lobos?|esqueletos?|zumbis?|mortos-vivos|servos?|espíritos?|imps?|demônios?|torretas?|chamas|corvos?|aves?|árvores?|iscas?|bonecos?|cópias|sombras)', tl)
        if mn2: n = num(mn2.group(1))
        if nm is None: s['inv'] = {'clone': True, 'n': n, 't': tt or 2}
        else: s['inv'] = {'nome': nm, 'cor': cor, 'tam': tam, 'vida': vida, 't': tt or 3, 'n': n}
        if s.get('m') == 'alvo' and not s.get('d'): s['m'] = 'si'
        break
    else:
        if base and base.get('inv'):   # "Dois clones." / "Três lobos."
            mn2 = re.search(r'\b' + NUMW + r' (?:clones?|lobos?|esqueletos?|zumbis?|mortos-vivos|servos?|espíritos?|imps?|demônios?|torretas?|chamas|corvos?|aves?|árvores?|iscas?|bonecos?|cópias|sombras)', tl)
            if mn2: s['inv'] = dict(base['inv'], n=num(mn2.group(1)))
    tc = re.sub(r'^(?:quando|se|sempre que|toda vez que)[^:,]*[:,]', '', tl).strip()
    # a invocação: os clones aparecem em volta de você; o resto, no lugar que você clica
    if s.get('inv') and not herda:
        if s['inv'].get('clone'): s.update(m='si')
        elif s.get('m') in ('alvo', 'si', None): s.update(m='ponto', al=al if al and al > 1 else 3)
    # mover
    mv = None
    m = re.search(r'' + NUMW + r' cédulas? para (?:trás|longe|fora)', tc) if re.search(r'empurr|joga|arremessa', tc) else None
    m = m or re.search(r'empurr\w*(?: [^.]{0,30}?)? ' + NUMW + r' cédulas?', tc) or re.search(r'empurr', tc)
    if m: mv = {'k': 'empurra', 'd': num(m.group(1)) if m.lastindex else 1}
    m = re.search(r'\bpuxa\w*(?: [^.]{0,30}?)? ' + NUMW + r' cédulas?', tc) or (re.search(r'\bpuxa(?:d[oa]s?)? (?:o alvo|um inimigo|para perto|até você)', tc))
    if m and not mv: mv = {'k': 'puxa', 'd': num(m.group(1)) if m.lastindex else 3}
    if re.search(r'troca(?:m)? de lugar', tc): mv = {'k': 'troca', 'd': 0}
    m = re.search(r'\b(?:anda|salta|corre|pula|teleporta|avança|recua|atravessa|dispara|voa)\w*(?: [^.]{0,20}?)? (?:até )?' + NUMW + r' cédulas?', tc)
    if m and not mv: mv = {'k': 'salta', 'd': num(m.group(1))}
    elif re.search(r'teleporta|reaparece|aparece (?:atrás|ao lado|colado)', tc) and not mv: mv = {'k': 'salta', 'd': al or 6}
    if mv:
        s['mv'] = mv
        if mv['k'] == 'salta' and s.get('d') and s.get('m') in (None, 'si', 'alvo', 'ponto') and not s.get('f'): s.update(m='alvo', al=mv['d'], q='i')   # o bote: salta e ataca
        elif mv['k'] == 'salta' and s.get('m') in (None, 'si', 'alvo') and not s.get('d'): s.update(m='ponto', al=mv['d'])
        if mv['k'] == 'troca' and s.get('m') == 'si': s.update(m='alvo', al=al or 30)
    # condições (sem a oração do gatilho: "Quando for empurrada ou derrubada, você cai de pé")
    limpa = bool(re.search(r'perde(?:m)? (?:todas )?as condições|sem condições|tira (?:uma |a |as )?(?:maldição|condição|condições|veneno|o veneno)|remove (?:uma |a )?condição', tl))
    if limpa: s['lp'] = 1
    cs = []
    te = teste(t); tt1 = tt or 1
    for p, cid in ([] if limpa else CONDS):
        if re.search(p, tc):
            mneg = re.search(p, tc)
            if re.search(r'(?:não|nem|sem) (?:fica\w*|é|está|pode ficar|\w+r) ?$', tc[max(0, mneg.start() - 22):mneg.start()]): continue
            if cid == 'marcado' and re.search(r'\bmarcad[oa]s? (?:pela|por)|contra (?:o|um) (?:alvo )?marcad|quem está marcad|alvo marcado|presa marcada', tl) and not re.search(r'\bmarca (?:um|o|uma|dois)', tl): continue
            if cid == 'caido' and re.search(r'(?:quando|se) (?:um|o|uma)? ?\w+ cai|cair\b|que cai\b|quem cai|antes de cair|caído\b(?! )', tl) and not re.search(r'derrub|o alvo cai|e cai\b|cai no chão', tl): continue
            if cid == 'distraido' and re.search(r'quem está distraíd|contra (?:quem|um alvo|o alvo) distraíd|acertar quem', tl) and not re.search(r'fica(?:m)? distraíd|distrai\b', tl): continue
            if cid == 'sangue' and re.search(r'contra quem (?:está )?sangr|em quem sangra', tl) and not re.search(r'\+\d camada|camadas? de sangramento', tl): continue
            cs.append([cid, tt1 if cid not in ('sangue', 'veneno', 'marcado', 'escolhido') else (tt or 0), te if cid in ('caido', 'preso', 'atordoado', 'medo', 'abalado', 'adormecido', 'sonolento', 'confuso', 'enfeiticado', 'cego', 'lento', 'distraido', 'silencio', 'gelo', 'provocado', 'desarmado', 'maldicao') else None, 'a'])
    if re.search(r'\bvira (?:o |a |um |uma |meia |fera|lobo|névoa|morcego|besta|raposa)', tl) and not re.search(r'vira frasco|vira o rosto', tl):
        cs.append(['transformado', tt or 10, None, 's'])
    for p, cid in CONDS_SI:
        if re.search(p, tc) and not re.search(r'(?:não|nem) (?:fica|ficam)\w* (?:escondid|invisív)', tc):
            cs.append([cid, tt or 1, None, 's' if s.get('m') in ('si', None, 'ponto', 'volta') or re.search(r'\bvocê\b', tl) else 'a'])
    # bônus e penalidades com duração: Inspirado (aliado/você) e Vulnerável / Fraquejado (inimigo)
    if tt and re.search(r'\+\d+ (?:tiers? de dano|no acerto|de dano)|\+\d+ tiers? de dano', tl) and not re.search(r'contra (?:o|um|quem)', tl[:40]):
        cs.append(['inspirado', tt, None, 'a' if s.get('q') == 'a' or re.search(r'\baliad', tl) else 's'])
    if re.search(r'defesa tier [IV]+', t, re.I) and not re.search(r'defesa -tier', tl) and (tt or s.get('m') != 'alvo'):
        cs.append(['escudo', tt or 1, None, 'a' if re.search(r'\baliad', tl) else 's'])
    if re.search(r'defesa -tier|-\d+ (?:na|de) defesa|e na defesa', tl): cs.append(['vulneravel', tt or 1, te, 'a'])
    if re.search(r'-\d+ no acerto|-\d+ tiers? de dano|-1 tier de dano', tl) and not re.search(r'você tem -|seus golpes', tl): cs.append(['fraco', tt or 1, te, 'a'])
    if re.search(r'\+\d+ cédulas? de movimento|anda o dobro|movimento dobrado', tl): cs.append(['acelerado', tt or 1, None, 's'])
    if herda and base.get('c'):
        cs = [c for c in base['c']] + [c for c in cs if c[0] not in [b[0] for b in base['c']]]
    if any(c[0] == 'maldicao' for c in cs): cs = [c for c in cs if c[0] not in ('vulneravel', 'fraco')]
    if any(c[0] == 'transformado' for c in cs) and s.get('m') == 'alvo' and not re.search(r'o alvo|um inimigo|num alvo|um alvo', tl): s.update(m='si')
    if cs:
        vis = set(); out = []
        for c in cs:
            if c[0] in vis: continue
            vis.add(c[0]); out.append(c)
        s['c'] = out
    elif base and base.get('c'):
        # "Por 3 turnos." no nível 2: as mesmas condições, com a duração nova
        if tt: s['c'] = [[c[0], tt if c[1] else 0, c[2], c[3]] for c in base['c']]
    if s.get('z') and tt: s['z'] = dict(s['z'], t=tt)
    if s.get('inv') and tt and not s['inv'].get('clone'): s['inv'] = dict(s['inv'], t=tt)
    if s.get('m') == 'alvo' and not herda: s['q'] = 'a' if re.search(r'\b(?:um|o|num|no|a um|ao) aliado', tl) and not re.search(r'\b(?:um|o|num) (?:alvo|inimigo)', tl) else 'i'
    if s.get('mv', {}).get('k') == 'salta' and s.get('m') == 'ponto' and not s.get('f') and any(c[3] == 'a' for c in s.get('c', [])): s.update(m='alvo', q='i')
    return s

def do_mapa_antigo(sp):
    if not sp: return {}
    if sp['k'] == 'token':
        if 'Clone' in sp['nome'] or sp['nome'] == 'Sombra': return {'inv': {'clone': True, 'n': sp.get('n', 1), 't': sp.get('turnos', 2)}}
        return {'inv': {'nome': sp['nome'], 'cor': sp['cor'], 'tam': sp.get('tam', 1), 'vida': sp.get('vida', 0), 't': sp.get('turnos', 3), 'n': sp.get('n', 1)}}
    return {'z': {'fx': sp['fx'], 't': sp.get('turnos', 1)}, 'f': 'line' if sp.get('forma') == 'line' else 'circ', 'r': sp.get('r', 1)}

def util(s):
    return any(k in s for k in ('z', 'inv', 'c', 'mv', 'd', 'cu')) or s.get('m') in ('ponto', 'volta')

def main():
    arv = json.load(open(sys.argv[1]))
    antigo = json.load(open(sys.argv[2])) if len(sys.argv) > 2 and os.path.exists(sys.argv[2]) else {}
    por_nome = {}
    for cid, m in antigo.items():
        for nome, sp in m.items(): por_nome[nome] = sp
    out, cont = {}, {'hab': 0, 'com': 0}
    for a in arv:
        for n in a['nodes']:
            gs = n.get('graus') or []
            if not any(g.get('uso') for g in gs): continue
            if 'passiva' in (n.get('usos') or []) and not any(g.get('uso') for g in gs): continue
            cont['hab'] += 1
            lst, base = [], None
            for g in gs:
                s = ler(g.get('texto', ''), n['nome'], base)
                velho = do_mapa_antigo(por_nome.get(n['nome']))
                if velho:
                    if 'inv' in velho and 'inv' not in s: s['inv'] = velho['inv']
                    if 'z' in velho and 'z' not in s:
                        s['z'] = velho['z']
                        if s.get('m') in (None, 'si', 'alvo') and not s.get('d'): s.update(m='ponto', f=velho['f'], r=velho['r'], al=s.get('al') or 4)
                        else: s.setdefault('f', velho['f']); s.setdefault('r', velho['r'])
                    if 'inv' in s and s.get('m') == 'alvo' and not s.get('d'): s['m'] = 'si'
                lst.append(s); base = s
            if any(util(s) for s in lst):
                out[n['id']] = [{k: v for k, v in s.items() if v is not None} for s in lst]
                cont['com'] += 1
    js = json.dumps(out, ensure_ascii=False, separators=(',', ':'))
    dest = os.path.join(os.path.dirname(__file__), '..', '..', 'tc', 'habs-acoes.js')
    with open(dest, 'w') as f:
        f.write('/* (lote 185) O que cada habilidade faz no mapa das Cenas, por nível: GERADO por src/habs/gerar_acoes.py a partir\n'
                '   do texto das árvores (não editar à mão; rodar de novo). Ver o cabeçalho do gerador para as chaves. */\n'
                '(function (root) {\n  \'use strict\';\n  const H = ' + js + ';\n'
                '  const API = { H, de: (id, grau) => { const l = H[id]; if (!l) return null; const g = Math.max(1, Math.min(l.length, Math.floor(grau) || 1)); return l[g - 1] || null; } };\n'
                '  if (typeof module !== \'undefined\' && module.exports) module.exports = API;\n'
                '  if (root) { root.TC = root.TC || {}; root.TC.habsAcoes = API; }\n'
                '})(typeof window !== \'undefined\' ? window : null);\n')
    print(cont, len(js) // 1024, 'KB')

if __name__ == '__main__':
    main()
