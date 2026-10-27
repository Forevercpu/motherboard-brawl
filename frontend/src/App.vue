<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Game } from './game/Game'
type Kind = 'dragon' | 'raptor'
type Status = 'ready' | 'playing' | 'paused' | 'won' | 'lost'
const canvas = ref<HTMLElement | null>(null)
const selected = ref<Kind>('dragon')
const state = ref<{playerHp:number;enemyHp:number;cooldown:number;status:Status}>({playerHp:100,enemyHp:100,cooldown:0,status:'ready'})
let game: Game | undefined
let error = ref('')
onMounted(() => { try { if(canvas.value) game = new Game(canvas.value, s => state.value = s) } catch { error.value = '无法初始化 3D 画面，请检查浏览器是否支持 WebGL。' } })
onUnmounted(() => game?.destroy())
const start = () => game?.start(selected.value)
</script>
<template>
  <main class="app">
    <div ref="canvas" class="viewport"></div>
    <div class="vignette"></div>
    <header class="topbar"><div class="brand"><span class="logo">✳</span><div><strong>主板乱斗</strong><small>MOTHERBOARD BRAWL</small></div><span class="tag">试玩原型</span></div><div class="topright">单人挑战 <span>●</span> 离线模式</div></header>
    <template v-if="state.status === 'playing' || state.status === 'paused'">
      <section class="hud"><div class="fighter"><div class="avatar red">{{ selected === 'dragon' ? '龙' : '鹰' }}</div><div class="stat"><div class="stat-title"><strong>你</strong><span>{{ Math.ceil(state.playerHp) }} / 100</span></div><div class="bar"><i :style="{width: state.playerHp + '%'}"></i></div></div></div><div class="versus">VS</div><div class="fighter enemy"><div class="stat"><div class="stat-title"><strong>电脑对手</strong><span>{{ Math.ceil(state.enemyHp) }} / 100</span></div><div class="bar"><i :style="{width: state.enemyHp + '%'}"></i></div></div><div class="avatar blue">AI</div></div></section>
      <div class="controls"><div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 移动 <span></span> <kbd>鼠标</kbd> 瞄准 / 左键射击</div><div class="skill"><b>SPACE</b><div><strong>战斧导弹</strong><small>{{ state.cooldown > 0 ? `冷却 ${state.cooldown.toFixed(1)}s` : '技能就绪' }}</small></div><div class="ready-dot" :class="{cooling:state.cooldown>0}"></div></div><button class="pause" @click="game?.togglePause()">Ⅱ <span>暂停</span></button></div>
    </template>
    <div v-if="state.status !== 'playing'" class="overlay">
      <div v-if="error" class="dialog"><h1>画面加载失败</h1><p>{{ error }}</p></div>
      <div v-else-if="state.status === 'ready'" class="dialog intro"><div class="eyebrow">THE CIRCUIT IS YOUR ARENA</div><h1>主板，就是<br><em>你的战场。</em></h1><p>缩小身形，进入电路之间。穿过内存与芯片，在这块主板上击败你的对手。</p><div class="choice-label">选择你的角色 <span>01 / 02</span></div><div class="choices"><button :class="{active:selected==='dragon'}" @click="selected='dragon'"><span class="choice-icon dragon">✦</span><span><strong>赤焰小龙</strong><small>导弹 · 火力压制</small></span><b>↗</b></button><button :class="{active:selected==='raptor'}" @click="selected='raptor'"><span class="choice-icon raptor">◆</span><span><strong>疾电猛禽</strong><small>能量 · 精准攻击</small></span><b>↗</b></button></div><button class="primary" @click="start">进入战场 <span>→</span></button><div class="hint">WASD 移动　·　鼠标瞄准 / 射击　·　空格释放导弹</div></div>
      <div v-else class="dialog result"><div class="eyebrow">{{ state.status === 'paused' ? 'SYSTEM PAUSED' : 'BATTLE COMPLETE' }}</div><h1>{{ state.status === 'paused' ? '战斗暂停' : state.status === 'won' ? '你赢了！' : '挑战失败' }}</h1><p>{{ state.status === 'paused' ? '休息一下，准备好了再继续。' : state.status === 'won' ? '成功控制主板，系统运行正常。' : '系统暂时离线，再来一局吧。' }}</p><button v-if="state.status === 'paused'" class="primary" @click="game?.togglePause()">继续战斗 <span>→</span></button><button v-else class="primary" @click="start">再来一局 <span>→</span></button><button class="secondary" @click="game?.reset(selected)">返回角色选择</button></div>
    </div>
    <div class="corner">BOARD 01 <span> / </span> CIRCUIT ARENA</div>
  </main>
</template>
