import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface FlyxCoin3DProps {
  theme: 'dark' | 'light';
}

/**
 * Draws the official FlyXCoin.com Gold Coin face onto a high-DPI 1024x1024 canvas:
 * - Top curved text: "★ FLYX COIN ★"
 * - Bottom curved text: "PLAY • MINE • WIN • EARN"
 * - Royal Red & Gold Jeweled Crown above the wings
 * - Spread multi-feathered Golden Wings with stylized central "F"
 * - Bold "FLYX" and "- COIN -" below the wings
 */
function createOfficialFlyxCoinTexture(): THREE.CanvasTexture {
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;

  // 1. Base metallic radial gold gradient
  const baseGrad = ctx.createRadialGradient(cx - 90, cy - 90, 40, cx, cy, size / 2);
  baseGrad.addColorStop(0, '#FFF2B2');
  baseGrad.addColorStop(0.35, '#F6C445');
  baseGrad.addColorStop(0.72, '#D49B1A');
  baseGrad.addColorStop(0.92, '#9E6B06');
  baseGrad.addColorStop(1, '#7A5002');

  ctx.fillStyle = baseGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
  ctx.fill();

  // 2. Outer milled denticles / coin border rings
  ctx.strokeStyle = '#6E4700';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, 488, 0, Math.PI * 2);
  ctx.stroke();

  // Inner recessed ring for inscription track
  ctx.strokeStyle = '#FCE181';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(cx, cy, 474, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#7C5104';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx, cy, 382, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#FFE89E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 376, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle sunburst lines inside inner medallion
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = 'rgba(255, 240, 175, 0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 72; i++) {
    ctx.rotate((Math.PI * 2) / 72);
    ctx.beginPath();
    ctx.moveTo(60, 0);
    ctx.lineTo(368, 0);
    ctx.stroke();
  }
  ctx.restore();

  // Helper to draw curved inscription text along an arc
  const drawArcText = (
    text: string,
    radius: number,
    startAngle: number,
    endAngle: number,
    isBottom: boolean
  ) => {
    ctx.save();
    ctx.font = '700 44px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const chars = Array.from(text);
    const totalAngle = endAngle - startAngle;
    const step = totalAngle / Math.max(1, chars.length - 1);

    chars.forEach((ch, i) => {
      const angle = startAngle + i * step;
      ctx.save();
      ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      ctx.rotate(angle + (isBottom ? -Math.PI / 2 : Math.PI / 2));

      // Engraved shadow
      ctx.fillStyle = '#593800';
      ctx.fillText(ch, 2, 3);
      // Raised gold highlight
      ctx.fillStyle = '#FFF3B8';
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });
    ctx.restore();
  };

  // 3. Top Arc Text: "★ FLYX COIN ★"
  drawArcText(
    '★ FLYX COIN ★',
    428,
    -Math.PI * 0.78,
    -Math.PI * 0.22,
    false
  );

  // 4. Bottom Arc Text: "PLAY • MINE • WIN • EARN"
  drawArcText(
    'PLAY • MINE • WIN • EARN',
    428,
    Math.PI * 0.84,
    Math.PI * 0.16,
    true
  );

  // 5. Royal Red & Gold Crown (Top Center inside medallion)
  ctx.save();
  ctx.translate(cx, cy - 165);

  // Red velvet crown cap
  ctx.fillStyle = '#991B1B';
  ctx.beginPath();
  ctx.ellipse(-38, -8, 36, 28, -0.2, Math.PI, 0);
  ctx.ellipse(38, -8, 36, 28, 0.2, Math.PI, 0);
  ctx.fill();

  // Golden crown arches & base band
  ctx.fillStyle = '#FDE073';
  ctx.strokeStyle = '#6B4400';
  ctx.lineWidth = 4;

  // Base headband of crown
  ctx.beginPath();
  if (typeof (ctx as any).roundRect === 'function') {
    (ctx as any).roundRect(-64, 8, 128, 22, 6);
  } else {
    ctx.rect(-64, 8, 128, 22);
  }
  ctx.fill();
  ctx.stroke();

  // Crown arches
  ctx.beginPath();
  ctx.moveTo(-64, 8);
  ctx.quadraticCurveTo(-50, -38, 0, -24);
  ctx.quadraticCurveTo(50, -38, 64, 8);
  ctx.closePath();
  ctx.stroke();

  // Central cross & orb on top of crown
  ctx.beginPath();
  ctx.arc(0, -36, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillRect(-3, -56, 6, 16);
  ctx.fillRect(-9, -50, 18, 5);

  // Jewels on crown band (ruby & emerald dots)
  [-42, -20, 0, 20, 42].forEach((jx, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? '#DC2626' : '#10B981';
    ctx.beginPath();
    ctx.arc(jx, 19, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  // 6. Spread Golden Eagle/Angel Wings (Left & Right)
  const drawWing = (mirror: 1 | -1) => {
    ctx.save();
    ctx.translate(cx, cy + 5);
    ctx.scale(mirror, 1);

    // 7 layered feather blades fanning outward
    for (let i = 0; i < 7; i++) {
      const angle = -0.32 + i * 0.13;
      const length = 295 - i * 24;
      const width = 26 - i * 1.5;

      ctx.save();
      ctx.rotate(angle);

      // Feather shadow
      ctx.fillStyle = '#6B4400';
      ctx.beginPath();
      ctx.moveTo(42, 4);
      ctx.quadraticCurveTo(length * 0.55, -width, length, -6);
      ctx.quadraticCurveTo(length * 0.65, width, 42, 16);
      ctx.closePath();
      ctx.fill();

      // Feather gold gradient
      const fGrad = ctx.createLinearGradient(40, 0, length, 0);
      fGrad.addColorStop(0, '#D89B1C');
      fGrad.addColorStop(0.5, '#FDE073');
      fGrad.addColorStop(1, '#FFF6C7');
      ctx.fillStyle = fGrad;
      ctx.strokeStyle = '#784E02';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.quadraticCurveTo(length * 0.55, -width, length, -8);
      ctx.quadraticCurveTo(length * 0.65, width * 0.85, 40, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();
  };

  drawWing(-1);
  drawWing(1);

  // 7. Stylized Center "F" Monogram Emblem
  ctx.save();
  ctx.font = 'italic 900 165px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Deep embossed shadow
  ctx.fillStyle = '#523300';
  ctx.fillText('F', cx + 5, cy + 16);

  // Bright gold metallic fill
  const fTextGrad = ctx.createLinearGradient(cx, cy - 75, cx, cy + 80);
  fTextGrad.addColorStop(0, '#FFFFFF');
  fTextGrad.addColorStop(0.35, '#FFE885');
  fTextGrad.addColorStop(0.8, '#D49412');
  fTextGrad.addColorStop(1, '#8F5B00');
  ctx.fillStyle = fTextGrad;
  ctx.strokeStyle = '#6B4400';
  ctx.lineWidth = 4;
  ctx.fillText('F', cx, cy + 10);
  ctx.strokeText('F', cx, cy + 10);
  ctx.restore();

  // 8. Bold "FLYX" and "- COIN -" Below the Wings
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '800 84px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#523300';
  ctx.fillText('FLYX', cx + 4, cy + 164);

  ctx.fillStyle = '#FFF1AE';
  ctx.strokeStyle = '#6E4600';
  ctx.lineWidth = 3;
  ctx.fillText('FLYX', cx, cy + 160);
  ctx.strokeText('FLYX', cx, cy + 160);

  ctx.font = '700 32px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = '#523300';
  ctx.fillText('- COIN -', cx + 2, cy + 216);
  ctx.fillStyle = '#FFE680';
  ctx.fillText('- COIN -', cx, cy + 214);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export const FlyxCoin3D: React.FC<FlyxCoin3DProps> = ({ theme }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [lowPowerMode, setLowPowerMode] = useState<boolean>(false);
  const [finishMode, setFinishMode] = useState<'brushed' | 'mirror'>('brushed');
  const [coinDataUrl, setCoinDataUrl] = useState<string>('');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setLowPowerMode(true);
    }
    // Generate static preview data URL from the official canvas generator for 2D fallback
    try {
      const tex = createOfficialFlyxCoinTexture();
      const canvasEl = tex.image as HTMLCanvasElement;
      setCoinDataUrl(canvasEl.toDataURL('image/png'));
    } catch {
      // ignore in SSR
    }
  }, []);

  useEffect(() => {
    if (lowPowerMode || !mountRef.current) return;

    const container = mountRef.current;
    let animationFrameId = 0;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 380;
    const height = container.clientHeight || 380;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 6.1);

    // Three-Point Studio Lighting matching FlyXCoin gold glow
    const ambientLight = new THREE.AmbientLight(0xfff5d6, theme === 'dark' ? 1.25 : 1.45);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffe28a, 3.4);
    keyLight.position.set(4, 5, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 1.3);
    fillLight.position.set(-5, -2, 4);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xffb800, 3.8, 18);
    rimLight.position.set(0, 3.5, -4.5);
    scene.add(rimLight);

    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    const officialTexture = createOfficialFlyxCoinTexture();
    const roughnessVal = finishMode === 'brushed' ? 0.24 : 0.1;
    const metalnessVal = finishMode === 'brushed' ? 0.85 : 0.94;

    const rimMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#E5A91B'),
      metalness: metalnessVal,
      roughness: roughnessVal,
    });

    const faceMaterial = new THREE.MeshStandardMaterial({
      map: officialTexture,
      bumpMap: officialTexture,
      bumpScale: 0.045,
      metalness: metalnessVal * 0.82,
      roughness: roughnessVal,
    });

    // Cylinder materials array: [side, topCap (front), bottomCap (back)]
    const bodyGeometry = new THREE.CylinderGeometry(1.66, 1.66, 0.22, 96);
    const bodyMesh = new THREE.Mesh(bodyGeometry, [rimMaterial, faceMaterial, faceMaterial]);
    bodyMesh.rotation.x = Math.PI / 2;
    bodyMesh.rotation.y = Math.PI / 2;
    coinGroup.add(bodyMesh);

    // Raised Outer Bullion Bezel Rings (Front & Back)
    const rimRingGeometry = new THREE.TorusGeometry(1.63, 0.055, 24, 96);
    const frontRim = new THREE.Mesh(rimRingGeometry, rimMaterial);
    frontRim.position.z = 0.095;
    coinGroup.add(frontRim);

    const backRim = new THREE.Mesh(rimRingGeometry, rimMaterial);
    backRim.position.z = -0.095;
    coinGroup.add(backRim);

    // Milled Edge Reeds (80 reeds around coin circumference)
    const reedGeometry = new THREE.BoxGeometry(0.03, 0.035, 0.225);
    const reedCount = 80;
    for (let i = 0; i < reedCount; i++) {
      const angle = (i / reedCount) * Math.PI * 2;
      const reed = new THREE.Mesh(reedGeometry, rimMaterial);
      reed.position.set(Math.cos(angle) * 1.66, Math.sin(angle) * 1.66, 0);
      reed.rotation.z = angle;
      coinGroup.add(reed);
    }

    // Initial subtle angle
    coinGroup.rotation.x = 0.08;
    coinGroup.rotation.y = -0.22;

    // Pointer Interaction State
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;
    let targetRotY = -0.22;
    let targetRotX = 0.08;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      targetRotY += dx * 0.012;
      targetRotX = Math.max(-0.65, Math.min(0.65, targetRotX + dy * 0.008));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domElem = renderer.domElement;
    domElem.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(animationFrameId);
      setWebglSupported(false);
    };

    const handleContextRestored = () => {
      setWebglSupported(true);
    };

    domElem.addEventListener('webglcontextlost', handleContextLost, false);
    domElem.addEventListener('webglcontextrestored', handleContextRestored, false);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 380;
      const newH = container.clientHeight || 380;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isDragging) {
        targetRotY += 0.006;
      }
      coinGroup.rotation.y += (targetRotY - coinGroup.rotation.y) * 0.08;
      coinGroup.rotation.x += (targetRotX - coinGroup.rotation.x) * 0.08;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domElem.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      domElem.removeEventListener('webglcontextlost', handleContextLost);
      domElem.removeEventListener('webglcontextrestored', handleContextRestored);
      window.removeEventListener('resize', handleResize);
      officialTexture.dispose();
      renderer.dispose();
    };
  }, [lowPowerMode, finishMode, theme]);

  return (
    <div className="relative w-full h-[360px] sm:h-[400px] flex flex-col items-center justify-center select-none">
      {/* FlyXCoin.com Signature Circular Halo & Orbiting Blue/Gold Node */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border-4 border-[#FFB800]/20 shadow-[0_0_60px_rgba(255,184,0,0.22)] flex items-center justify-center"
        >
          {/* Orbiting Capsule Indicator matching the FlyXCoin.com screenshot */}
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-[#38BDF8]/30 via-[#1D63FF]/50 to-[#FFB800]/40 border border-[#38BDF8]/50 backdrop-blur-md shadow-[0_0_18px_rgba(56,189,248,0.65)]">
            <span className="w-2 h-2 rounded-full bg-[#FFB800] animate-ping" />
            <span className="w-4 h-2.5 rounded-full bg-[#0B162C] border border-[#38BDF8] flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
            </span>
          </div>
        </div>
      </div>

      {!lowPowerMode && webglSupported ? (
        <div
          ref={mountRef}
          className="relative z-10 w-full h-full cursor-grab active:cursor-grabbing"
          title="Drag to rotate the official 3D FLYX Coin"
          aria-label="Interactive 3D rotating official FLYX Coin model"
        />
      ) : (
        /* Graceful 2D Official FLYX Coin Fallback */
        <div className="relative z-10 flex flex-col items-center justify-center p-4">
          <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full p-1.5 border-2 border-[#FFB800]/60 shadow-[0_0_40px_rgba(255,184,0,0.28)] overflow-hidden bg-[#0B162C] flex items-center justify-center">
            {coinDataUrl ? (
              <img
                src={coinDataUrl}
                alt="Official FLYX Coin (PLAY • MINE • WIN • EARN)"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <span className="font-display text-3xl font-extrabold text-[#FFB800]">
                  FLYX COIN
                </span>
                <span className="text-[11px] text-[#93C5FD] mt-1 font-mono">
                  PLAY • MINE • WIN • EARN
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Finish & Performance Controls */}
      <div className="relative z-20 mt-1 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#081021]/80 backdrop-blur-sm border border-[#1E3A8A]/50 text-xs">
        <button
          type="button"
          onClick={() => {
            setLowPowerMode(false);
            setFinishMode('brushed');
          }}
          className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
            !lowPowerMode && finishMode === 'brushed'
              ? 'bg-[#FFB800] text-[#081021] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          3D Royal Gold
        </button>
        <button
          type="button"
          onClick={() => {
            setLowPowerMode(false);
            setFinishMode('mirror');
          }}
          className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
            !lowPowerMode && finishMode === 'mirror'
              ? 'bg-[#1D63FF] text-white font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          3D Proof Polish
        </button>
        <button
          type="button"
          onClick={() => setLowPowerMode((prev) => !prev)}
          className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
            lowPowerMode
              ? 'bg-[#FFB800] text-[#081021] font-bold'
              : 'text-[#94A3B8] hover:text-white'
          }`}
        >
          {lowPowerMode ? '2D Emblem Active' : 'Low-Power 2D'}
        </button>
      </div>
    </div>
  );
};
