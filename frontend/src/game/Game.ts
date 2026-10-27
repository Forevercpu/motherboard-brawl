import * as THREE from 'three'

type Kind = 'dragon' | 'raptor'
type Status = 'ready' | 'playing' | 'paused' | 'won' | 'lost'
type Snapshot = { playerHp: number; enemyHp: number; cooldown: number; status: Status }
type Unit = { group: THREE.Group; pos: THREE.Vector3; hp: number; kind: Kind; shot: number; skill: number }
type Bullet = { mesh: THREE.Mesh; velocity: THREE.Vector3; owner: Unit; damage: number; life: number; radius: number; explosive: boolean }
type Obstacle = { x: number; z: number; w: number; d: number }

export class Game {
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 150)
  private renderer: THREE.WebGLRenderer
  private clock = new THREE.Clock()
  private ray = new THREE.Raycaster()
  private pointer = new THREE.Vector2(0, 0)
  private plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  private keys = new Set<string>()
  private obstacles: Obstacle[] = []
  private bullets: Bullet[] = []
  private player!: Unit
  private enemy!: Unit
  private status: Status = 'ready'
  private firing = false
  private frame = 0
  private elapsed = 0
  private updateUI = 0
  private selected: Kind = 'dragon'
  private resizeObserver: ResizeObserver
  private onKeyDown = (e: KeyboardEvent) => { if (['Space','KeyW','KeyA','KeyS','KeyD','Escape'].includes(e.code)) e.preventDefault(); if (e.code === 'Escape' && !e.repeat) this.togglePause(); if (e.code === 'Space' && !e.repeat) this.useSkill(); this.keys.add(e.code) }
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.code)
  private onBlur = () => { this.keys.clear(); this.firing = false; if (this.status === 'playing') this.togglePause() }
  private onPointerMove = (e: PointerEvent) => { const r = this.renderer.domElement.getBoundingClientRect(); this.pointer.set(((e.clientX-r.left)/r.width)*2-1, -((e.clientY-r.top)/r.height)*2+1) }
  private onDown = (e: PointerEvent) => { if (e.button === 0 && this.status === 'playing') this.firing = true }
  private onUp = () => { this.firing = false }
  constructor(private container: HTMLElement, private notify: (s: Snapshot) => void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); this.renderer.setClearColor(0x080e1a)
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)
    this.scene.background = new THREE.Color(0x080e1a)
    this.scene.fog = new THREE.Fog(0x080e1a, 35, 85)
    this.scene.add(new THREE.HemisphereLight(0x94cfff, 0x24202b, 2))
    const light = new THREE.DirectionalLight(0xffe6c5, 2.4); light.position.set(-10, 24, 12); light.castShadow = true; light.shadow.mapSize.set(1024,1024); light.shadow.camera.left=-24; light.shadow.camera.right=24; light.shadow.camera.top=24; light.shadow.camera.bottom=-24; this.scene.add(light)
    this.makeMap(); this.reset('dragon')
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(container); this.resize()
    window.addEventListener('keydown', this.onKeyDown); window.addEventListener('keyup', this.onKeyUp); window.addEventListener('blur', this.onBlur); window.addEventListener('pointerup', this.onUp)
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove); this.renderer.domElement.addEventListener('pointerdown', this.onDown)
    this.loop()
  }
  private material(color: number, emissive = 0x000000) { return new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.65, metalness: 0.55, roughness: 0.4 }) }
  private box(x:number,y:number,z:number,w:number,h:number,d:number,color:number, emissive=0) { const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),this.material(color,emissive)); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; this.scene.add(mesh); return mesh }
  private makeMap() {
    // 战场以主板为地面；发光线路及小元件仅作装饰，掩体单独登记碰撞。
    this.box(0, -.55, 0, 32, 1, 24, 0x202521)
    this.box(0, -1.15, 0, 33, .3, 25, 0x10151a)
    const gold = 0xd39627
    const glow = 0x6e3904
    for (let i = 0; i < 16; i++) {
      const z = -10.8 + i * 1.43
      this.box(0, -.035, z, 30.4, .025, .035, i % 3 ? 0x786b3a : gold, i % 3 ? 0x241d08 : glow)
    }
    for (let i = 0; i < 20; i++) {
      const x = -14.5 + i * 1.52
      this.box(x, -.03, 0, .035, .025, 22, 0x706039, 0x211909)
    }
    const obstacle = (x: number, z: number, w: number, d: number, h: number, color: number) => {
      this.obstacles.push({ x, z, w, d })
      this.box(x, h / 2, z, w, h, d, color)
    }
    // CPU 底座与地面连通，允许角色从四面进入中心战区。
    this.box(0, -.025, 0, 6.1, .05, 6.1, 0x999c91)
    this.box(0, -.012, 0, 5.4, .025, 5.4, 0x353b38)
    this.box(0, .002, 0, 4.5, .025, 4.5, 0x77786d)
    for (let i = -4; i <= 4; i++) {
      this.box(i * .48, .02, 0, .025, .025, 4.25, 0xb2a77a)
      this.box(0, .02, i * .48, 4.25, .025, .025, 0xb2a77a)
    }
    for (const x of [-2.8, 2.8]) for (const z of [-2.8, 2.8]) this.box(x, .035, z, .25, .04, .25, gold, glow)
    // 散热装甲：挡住角色和子弹，但保留绕行通道。
    for (const [x, z, w, d] of [[-10, -6.4, 4.2, 2.3], [-10, 4.8, 4.2, 2.3], [10, 7.8, 4.0, 1.8]]) {
      obstacle(x, z, w, d, 1.55, 0x30383b)
      this.box(x, 1.58, z, w * .9, .07, d * .82, 0x505858)
      for (let i = -2; i <= 2; i++) this.box(x + i * .58, 1.64, z, .13, .07, d * .76, 0x171e20)
      this.box(x, 1.69, z, w * .65, .035, .1, gold, glow)
    }
    // 四条内存槽形成可绕行的墙体，每条使用与外观一致的碰撞盒。
    for (let i = 0; i < 4; i++) {
      const x = 6.5 + i * 1.65
      obstacle(x, -5.5, .65, 6.5, 1.05, 0x20292d)
      this.box(x, 1.08, -5.5, .5, .07, 6.1, 0x56605f)
      for (const z of [-8.35, -2.65]) this.box(x, 1.15, z, .72, .18, .35, gold)
    }
    // PCIe 插槽与 M.2 散热片放在下半区，缩短长度留出通道。
    for (const z of [5.2, 8.8]) {
      obstacle(-3.8, z, 6.2, .65, .62, 0x222b2c)
      this.box(-3.8, .66, z, 5.8, .07, .34, 0xb0a27b)
      this.box(-3.8, .71, z, 5.3, .05, .12, 0x232b2b)
    }
    this.box(3.6, .12, 6.1, 3.8, .24, .8, 0x4a5250)
    this.box(3.6, .26, 6.1, 3.3, .04, .1, gold, glow)
    // 四周接口、芯片和电容：边缘装饰不占用出生点。
    for (let i = 0; i < 6; i++) {
      const z = -9.2 + i * 3.5
      this.box(-15.35, .55, z, 1.1, 1.1, 1.8, 0x56605e)
      this.box(-15.4, 1.13, z, .65, .05, 1.15, 0x20282a)
    }
    for (let i = 0; i < 12; i++) {
      const x = -13.5 + i * 2.45
      this.box(x, .16, -11.5, 1.05, .32, .55, 0x323b3a)
      this.box(x, .33, -11.5, .55, .04, .2, gold)
    }
    for (const [x, z] of [[-6.6,-3.7],[-6.6,1.5],[4.5,2.6],[7,10.7],[-9,10.7],[13.8,2.5]]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(.28, .28, .55, 12), this.material(0x59605a))
      cap.position.set(x,.275,z); cap.castShadow = true; this.scene.add(cap)
    }
  }
  private createUnit(kind:Kind, x:number,z:number):Unit {
    const group=new THREE.Group(); const color=kind==='dragon'?0xe43739:0x29bed8
    const body=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12),this.material(color)); body.position.y=.82; body.castShadow=true; group.add(body)
    const head=new THREE.Mesh(new THREE.SphereGeometry(.47,16,12),this.material(kind==='dragon'?0x712532:0x1b4e68)); head.position.set(0,1.48,0); group.add(head)
    for(const side of [-1,1]) { const eye=new THREE.Mesh(new THREE.SphereGeometry(.09,10,8),new THREE.MeshBasicMaterial({color:0xffffff})); eye.position.set(side*.19,1.53,.41); group.add(eye); const foot=new THREE.Mesh(new THREE.BoxGeometry(.3,.3,.42),this.material(0x172434)); foot.position.set(side*.34,.18,.06); group.add(foot)
      const wing=new THREE.Mesh(new THREE.BoxGeometry(.65,.12,.52),this.material(color)); wing.position.set(side*.8,1,-.15); wing.rotation.z=side*.45; group.add(wing) }
    const gun=new THREE.Mesh(new THREE.CylinderGeometry(.15,.2,.85,10),this.material(0x526776)); gun.rotation.x=Math.PI/2; gun.position.set(.42,.9,.65); group.add(gun)
    group.position.set(x,0,z); this.scene.add(group); return {group,pos:group.position,hp:100,kind,shot:0,skill:0}
  }
  reset(kind:Kind) { this.selected=kind; if(this.player) this.scene.remove(this.player.group); if(this.enemy) this.scene.remove(this.enemy.group); for(const b of this.bullets) this.scene.remove(b.mesh); this.bullets=[]; this.keys.clear(); this.firing=false; this.player=this.createUnit(kind,-12,8); this.enemy=this.createUnit(kind==='dragon'?'raptor':'dragon',13.8,-10); this.status='ready'; this.emit() }
  start(kind:Kind) { this.reset(kind); this.status='playing'; this.clock.getDelta(); this.emit() }
  togglePause() { if(this.status==='playing'){this.status='paused';this.keys.clear();this.firing=false} else if(this.status==='paused'){this.status='playing';this.clock.getDelta()} this.emit() }
  private emit(){this.notify({playerHp:Math.max(0,this.player.hp),enemyHp:Math.max(0,this.enemy.hp),cooldown:Math.max(0,this.player.skill),status:this.status})}
  private move(unit:Unit, dx:number,dz:number) { const tryAxis=(axis:'x'|'z',v:number)=>{ const prev=unit.pos[axis]; unit.pos[axis]=THREE.MathUtils.clamp(prev+v,axis==='x'?-15: -11,axis==='x'?15:11); if(this.obstacles.some(o=>Math.abs(unit.pos.x-o.x)<o.w/2+.55 && Math.abs(unit.pos.z-o.z)<o.d/2+.55)) unit.pos[axis]=prev }; tryAxis('x',dx); tryAxis('z',dz) }
  private shoot(owner:Unit, dir:THREE.Vector3, explosive=false) { if(dir.lengthSq()<.001)return; const velocity=dir.clone().setY(0).normalize().multiplyScalar(explosive?11:18); const mesh=new THREE.Mesh(new THREE.SphereGeometry(explosive?.24:.12,10,8),new THREE.MeshBasicMaterial({color: explosive?0xffab3d:owner===this.player?0x61f5ff:0xff5c65})); mesh.position.copy(owner.pos).add(new THREE.Vector3(0,.8,0)).addScaledVector(velocity.clone().normalize(),.9); this.scene.add(mesh); this.bullets.push({mesh,velocity,owner,damage:explosive?32:8,life:2.5,radius:explosive?2.3:.55,explosive}) }
  private useSkill(){if(this.status!=='playing'||this.player.skill>0)return; const target=this.aim(); if(target){this.shoot(this.player,target.sub(this.player.pos),true);this.player.skill=5;this.emit()} }
  private aim(){this.ray.setFromCamera(this.pointer,this.camera); const point=new THREE.Vector3(); return this.ray.ray.intersectPlane(this.plane,point)?point:null}
  private update(dt:number) {
    this.elapsed+=dt; this.player.shot-=dt; this.enemy.shot-=dt; this.player.skill=Math.max(0,this.player.skill-dt)
    let dx=Number(this.keys.has('KeyD'))-Number(this.keys.has('KeyA')), dz=Number(this.keys.has('KeyS'))-Number(this.keys.has('KeyW')); const len=Math.hypot(dx,dz); if(len){dx/=len;dz/=len;this.move(this.player,dx*5.4*dt,dz*5.4*dt)}
    const target=this.aim(); if(target){ const dir=target.sub(this.player.pos); this.player.group.rotation.y=Math.atan2(dir.x,dir.z); if(this.firing&&this.player.shot<=0){this.shoot(this.player,dir);this.player.shot=.23} }
    const toward=this.player.pos.clone().sub(this.enemy.pos); const distance=toward.length(); this.enemy.group.rotation.y=Math.atan2(toward.x,toward.z)
    // 敌人保持距离，并周期性横移；简单原型不提供复杂寻路。
    if(distance>5){toward.normalize(); const strafe=Math.sin(this.elapsed*1.3)*.55; this.move(this.enemy,(toward.x-strafe*toward.z)*2*dt,(toward.z+strafe*toward.x)*2*dt)}
    if(distance<19 && this.enemy.shot<=0){this.shoot(this.enemy,toward);this.enemy.shot=.7}
    for(let i=this.bullets.length-1;i>=0;i--){const b=this.bullets[i]; b.mesh.position.addScaledVector(b.velocity,dt);b.life-=dt; const p=b.mesh.position; const hitObstacle=this.obstacles.some(o=>Math.abs(p.x-o.x)<o.w/2 && Math.abs(p.z-o.z)<o.d/2); const victim=b.owner===this.player?this.enemy:this.player; const hit=Math.hypot(p.x-victim.pos.x,p.z-victim.pos.z)<(b.explosive?b.radius:.65); if(hit)victim.hp-=b.damage; if(hit||hitObstacle||b.life<=0||Math.abs(p.x)>16||Math.abs(p.z)>12){this.scene.remove(b.mesh);b.mesh.geometry.dispose();(b.mesh.material as THREE.Material).dispose();this.bullets.splice(i,1)} }
    if(this.player.hp<=0||this.enemy.hp<=0){this.status=this.player.hp<=0?'lost':'won';this.firing=false;this.emit()}
    this.updateUI+=dt; if(this.updateUI>.1){this.updateUI=0;this.emit()}
  }
  private resize(){ const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h) }
  private loop=()=>{this.frame=requestAnimationFrame(this.loop);const dt=Math.min(this.clock.getDelta(),.04);if(this.status==='playing')this.update(dt); const focus=this.player.pos; this.camera.position.lerp(new THREE.Vector3(focus.x,20,focus.z+18),.08);this.camera.lookAt(focus.x,0,focus.z);this.renderer.render(this.scene,this.camera)}
  destroy(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();window.removeEventListener('keydown',this.onKeyDown);window.removeEventListener('keyup',this.onKeyUp);window.removeEventListener('blur',this.onBlur);window.removeEventListener('pointerup',this.onUp);this.renderer.domElement.removeEventListener('pointermove',this.onPointerMove);this.renderer.domElement.removeEventListener('pointerdown',this.onDown);this.scene.traverse(obj=>{if(obj instanceof THREE.Mesh){obj.geometry.dispose(); const m=obj.material; (Array.isArray(m)?m:[m]).forEach(v=>v.dispose())}});this.renderer.dispose();this.renderer.domElement.remove()}
}

