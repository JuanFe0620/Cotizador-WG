import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function Visor3D({ ancho = 50, alto = 100, fondo = 40 }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const meshRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Escena, Cámara y Renderizador
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617'); // Fondo oscuro Slate-950
    sceneRef.current = scene;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.5, 2, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 2. Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight1.position.set(5, 8, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x3b82f6, 0.5);
    dirLight2.position.set(-5, -2, -5);
    scene.add(dirLight2);

    // 3. Grid / Cuadrícula de suelo
    const grid = new THREE.GridHelper(10, 20, 0x3b82f6, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // 4. Crear el Objeto Gabinete
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.6,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // Bordes remarcados estilo CAD
    const edges = new THREE.EdgesGeometry(geometry);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x93c5fd }));
    mesh.add(line);

    meshRef.current = mesh;
    scene.add(mesh);

    // 5. Controles del Mouse (OrbitControls)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // 6. Bucle de animación
    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize listener
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Limpieza al desmontar
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Actualizar la escala del objeto 3D según los cm ingresados
  useEffect(() => {
    if (meshRef.current) {
      const scaleX = (parseFloat(ancho) || 50) / 50;
      const scaleY = (parseFloat(alto) || 100) / 50;
      const scaleZ = (parseFloat(fondo) || 40) / 50;

      meshRef.current.scale.set(scaleX, scaleY, scaleZ);
      meshRef.current.position.y = scaleY / 2; // Mantenerlo sobre la cuadrícula
    }
  }, [ancho, alto, fondo]);

  return (
    <div className="w-full h-[320px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden relative shadow-inner mb-4">
      <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-lg border border-slate-700 text-[11px] text-slate-300">
        🖱️ Clic izq: Rotar | Clic der: Mover | Rueda: Zoom
      </div>
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}