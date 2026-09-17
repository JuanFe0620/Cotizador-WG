import trimesh
import os
base = os.path.join('frontend','public','models')
for name in ['TuboPoste.glb','BaseRedondaPAleta.glb','BaseRedondaPTriangular.glb','BaseCuadradaPAleta.glb','BaseCuadradaPTriangular.glb','PlatinaRedonda.glb','PlatinaCuadrada.glb','CoronaRedondaPtriangular.glb']:
    path = os.path.join(base, name)
    mesh = trimesh.load(path, force='mesh')
    bounds = mesh.bounds
    size = bounds[1] - bounds[0]
    print(name)
    print('  min:', bounds[0])
    print('  max:', bounds[1])
    print('  size:', size)
    print('  units:', getattr(mesh, 'units', None))
