import React, { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import { construirTubos } from './visor/builders/tubosBuilder';
import { construirBases } from './visor/builders/basesBuilder';
import { construirPlatinas } from './visor/builders/platinasBuilder';
import { construirCoronas } from './visor/builders/coronasBuilder';
import { construirCuboPoste } from './visor/builders/cuboBuilder';
import { construirCotas } from './visor/builders/cotasBuilder';
import { construirGabinete } from './visor/builders/gabineteBuilder';
import { buildBrazo } from './visor/builders/brazosBuilder';
import { construirPuerta } from './visor/builders/puertasBuilder';

const VisorM3 = forwardRef(({ 
  categoriaSel = 'postes', 
  params = {}, 
  tubos = [], 
  accesorios = [], 
  laminas = [], 
  cantidadesAcc = {} 
}, ref) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const gridRef = useRef(null);
  const controlsRef = useRef(null);

  const renderizarEscena = useCallback((paramsTarget, cantidadesAccTarget = {}) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // 1. Limpiar mallas previas
    const objetosAEliminar = [];
    scene.children.forEach((child) => {
      if (!child.isLight && child !== gridRef.current) {
        objetosAEliminar.push(child);
      }
    });

    objetosAEliminar.forEach((obj) => {
      scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => mat.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // 2. Normalización de Categoría
    const catOriginal = String(paramsTarget?.categoria || paramsTarget?.categoriaSel || categoriaSel || '').toLowerCase();
    const esGabinete = catOriginal.includes('gabinete') || catOriginal.includes('gabinetes');
    const esBrazo = catOriginal.includes('brazo') || catOriginal.includes('brazos');

    // 3. Normalización de Parámetros y detección de ROLADA / PTZ
    const listaAccSel = paramsTarget?.accesoriosSeleccionados || (paramsTarget?.accesorios_lista || []).map(a => a.id) || [];
    
    const tieneRolada = listaAccSel.some(accId => {
      const accObj = accesorios.find(a => String(a.id) === String(accId));
      return accObj && String(accObj.nombre || '').toLowerCase().includes('rolada');
    }) || paramsTarget?.rolada === true;

    const paramsNormalizados = {
      ...paramsTarget,
      alto: paramsTarget?.alto || paramsTarget?.detalles?.alto || paramsTarget?.alto_cm || 100,
      ancho: paramsTarget?.ancho || paramsTarget?.detalles?.ancho || paramsTarget?.ancho_cm || 50,
      fondo: paramsTarget?.fondo || paramsTarget?.detalles?.fondo || paramsTarget?.fondo_cm || 30,
      tramos: paramsTarget?.tramos || paramsTarget?.detalles?.tramos || [],
      accesoriosSeleccionados: listaAccSel,
      esRolada: tieneRolada
    };

    // 4. Material genérico
    const colorPintura = paramsNormalizados?.colorPintura || paramsNormalizados?.pintura || '#2563eb';
    const matGenerico = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorPintura),
      metalness: 0.3,
      roughness: 0.4
    });

    const loader = new GLTFLoader();

    const paramsCompletos = {
      ...paramsNormalizados,
      accesorios,
      cantidadesAcc: cantidadesAccTarget
    };

    if (esGabinete) {
      const { altoGabinete } = construirGabinete({
        loader,
        params: paramsCompletos,
        matGenerico,
        scene
      });

      construirPuerta({
        loader,
        params: paramsCompletos,
        matGenerico,
        scene
      });

      if (controlsRef.current) {
        const altoRef = altoGabinete || paramsNormalizados.alto || 100;
        const altoEnMetros = (altoRef < 10 ? altoRef * 100 : altoRef) / 100;
        controlsRef.current.target.set(0.15, altoEnMetros / 2, 0);
      }
    } else if (esBrazo) {
      const bujeId = paramsCompletos.bujeInicial || paramsCompletos.bujeInicialId || paramsCompletos.bujeBase;
      
      const bujeEncontrado = accesorios.find(a => 
        String(a.id) === String(bujeId) || 
        String(a.nombre).toLowerCase() === String(bujeId).toLowerCase()
      );

      const paramsConBuje = {
        ...paramsCompletos,
        objetoBujeInicial: bujeEncontrado
      };

      const brazoMesh = buildBrazo(paramsConBuje, tubos, accesorios, loader, scene);
      scene.add(brazoMesh);

      const bbox = new THREE.Box3().setFromObject(brazoMesh);
      const centro = new THREE.Vector3();
      bbox.getCenter(centro);

      if (controlsRef.current) {
        controlsRef.current.target.copy(centro);
      }
    } else {
      // POSTES
      const { obtenerPulgadasTubo, limitesTramos } = construirTubos({ 
        loader, 
        params: paramsNormalizados, 
        tubos, 
        matGenerico, 
        scene 
      });

      const primerTramo = paramsNormalizados?.tramos?.[0] || {};
      const tuboObj0 = tubos.find(t => String(t.id) === String(primerTramo.tuboId));
      const textoTipoTubo = (primerTramo?.tipo || primerTramo?.forma || tuboObj0?.tipo || paramsNormalizados?.tipoTubo || '').toLowerCase();
      const esCuadrado = textoTipoTubo.includes('cuad') || paramsNormalizados?.esCuadrado === true;

      // Base
      construirBases({ 
        loader, 
        laminas, 
        matGenerico, 
        scene, 
        obtenerPulgadasTubo,
        esCuadrado,
        params: paramsNormalizados 
      });

      // Accesorios
      paramsNormalizados.accesoriosSeleccionados.forEach((accId) => {
        const accObj = accesorios.find(a => String(a.id) === String(accId));
        const nombreAcc = (accObj?.nombre || '').toLowerCase();
        
        const cantidadPedida = cantidadesAccTarget[accId] || paramsNormalizados?.cantidadesAcc?.[accId] || 1;
        const detalles = {
          ...(paramsNormalizados?.detallesAccesorios?.[accId] || {}),
          cantidad: cantidadPedida,
          ...accObj
        };

        if (nombreAcc.includes('platina')) {
          construirPlatinas({ 
            loader, 
            nombreAcc, 
            accesorios, 
            accesoriosSeleccionados: paramsNormalizados.accesoriosSeleccionados, 
            matGenerico, 
            scene, 
            obtenerPulgadasTubo,
            params: paramsNormalizados,
            laminas
          });
        }

        if (nombreAcc.includes('corona')) {
          construirCoronas({ 
            loader, 
            detalles, 
            params: paramsNormalizados, 
            obtenerPulgadasTubo, 
            matGenerico, 
            scene, 
            esCuadrado 
          });
        }

        if (nombreAcc.includes('cubo')) {
          construirCuboPoste({ 
            loader, 
            limitesTramos, 
            matGenerico, 
            scene, 
            cantidad: cantidadPedida 
          });
        }
      });

      // RENDERIZADO DE BRAZOS MONTAJES EN POSTE
      const listaBrazos = paramsNormalizados.brazos || paramsNormalizados.brazosAdicionales || [];
      if (listaBrazos.length > 0) {
        // 1. Extraer altura de forma segura ANTES de la carga asíncrona
        let alturaCuboM = 1.5;
        if (Array.isArray(limitesTramos) && limitesTramos.length > 0 && limitesTramos[0]?.yMax) {
          alturaCuboM = limitesTramos[0].yMax;
        }

        // 2. Extraer radio del poste de forma segura (ancho dinámico)
        let radioPosteMetros = 0.038; // 3.8 cm por defecto (tubo de 3")
        try {
          const tramo0 = paramsNormalizados?.tramos?.[0] || {};
          if (typeof obtenerPulgadasTubo === 'function') {
            const pulg = obtenerPulgadasTubo(tramo0);
            if (pulg) radioPosteMetros = (parseFloat(pulg) * 0.0254) / 2;
          }
        } catch (e) {
          console.warn('No se pudo calcular el radio exacto, usando default:', e);
        }

        // Offset dinámico: Radio del tubo + espesor de la pared del cubo (~1.5 cm)
        const offsetExterior = radioPosteMetros + 0.015;

        listaBrazos.forEach((brazo) => {
          let nombreArchivo = brazo.archivo_glb || brazo.archivoGlb || 'PTZganzoC18.glb';
          if (!nombreArchivo.startsWith('/models/') && !nombreArchivo.startsWith('http')) {
            nombreArchivo = `/models/${nombreArchivo}`;
          }

          loader.load(
            nombreArchivo,
            (gltf) => {
              const brazoMesh = gltf.scene;

              const rotDeg = parseFloat(brazo.rotacionDeg ?? brazo.rotacion ?? 0);
              const rotacionRad = (rotDeg * Math.PI) / 180;

              // Posicionar a la altura del cubo y aplicar offset según el ancho del poste
              brazoMesh.position.set(0, alturaCuboM, 0);
              brazoMesh.rotation.y = rotacionRad;
              brazoMesh.translateX(offsetExterior);

              brazoMesh.traverse((child) => {
                if (child.isMesh) {
                  child.material = matGenerico;
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });

              scene.add(brazoMesh);
            },
            undefined,
            (err) => console.error(`Error al cargar el brazo GLB (${nombreArchivo}):`, err)
          );
        });
      }

      // Cotas
      construirCotas({
        limitesTramos,
        scene,
        params: paramsNormalizados
      });

      if (controlsRef.current && limitesTramos && limitesTramos.length > 0) {
        const ultimoTramo = limitesTramos[limitesTramos.length - 1];
        const altoTotal = ultimoTramo?.yMax || 1.5;
        controlsRef.current.target.set(0, altoTotal / 2, 0);
      }
    }
  }, [tubos, accesorios, laminas, categoriaSel]);

  useImperativeHandle(ref, () => ({
    getInstanciasThree: () => ({
      scene: sceneRef.current,
      camera: cameraRef.current,
      renderer: rendererRef.current,
      grid: gridRef.current
    }),

    cargarModeloItem: (item) => {
      return new Promise((resolve) => {
        if (!sceneRef.current || !rendererRef.current || !cameraRef.current) {
          resolve();
          return;
        }

        const paramsItem = {
          ...item,
          tramos: item.tramos || item.detalles?.tramos || [],
          accesoriosSeleccionados: item.accesoriosSeleccionados || (item.accesorios_lista || []).map(a => a.id),
          colorPintura: item.pintura || item.colorPintura || '#2563eb'
        };

        const cantidadesAccItem = item.cantidadesAcc || {};

        renderizarEscena(paramsItem, cantidadesAccItem);

        setTimeout(() => {
          if (sceneRef.current && cameraRef.current && rendererRef.current) {
            sceneRef.current.updateMatrixWorld(true);
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
          resolve();
        }, 450);
      });
    }
  }), [renderizarEscena]);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.0, 1.5, 2.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    gridRef.current = grid;
    scene.add(grid);

    let animationFrameId;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current) {
      renderizarEscena(params, cantidadesAcc);
    }
  }, [params, cantidadesAcc, categoriaSel, tubos, accesorios, laminas, renderizarEscena]);

  return (
    <div className="w-full h-full min-h-[450px] relative rounded-xl overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
});

export default VisorM3;