import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD, MAX_SOURCES, NOISE } from './shaders';

/**
 * The body of the matter: a dense sphere mesh displaced by the same folding field the particles
 * follow. Shaded as dark combed fibre (anisotropic streaks along the flow), with darker valleys,
 * luminous veins on the fold crests, a frayed silhouette, and a growth mask that reveals it as the
 * music accumulates.
 */
export function createMatter(detail = 110) {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(1, detail);
  g.deleteAttribute('normal');
  g.deleteAttribute('uv');
  g = mergeVertices(g);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uR: { value: 1.12 }, uAmp: { value: 0.55 }, uFreq: { value: 0.95 }, uWarp: { value: 0.9 }, uEvolve: { value: 0.025 }, uLobe: { value: 0.6 },
      uStretch: { value: new THREE.Vector3(1.22, 1, 1) }, uFlowScale: { value: 1.5 },
      uKeyDir: { value: new THREE.Vector3(-0.4, 0.7, 0.5).normalize() }, uKey: { value: 1 }, uAmbient: { value: 0.1 }, uRim: { value: 0.6 },
      uAlbedo: { value: 0.2 }, uSheen: { value: 0.5 }, uCrestGlow: { value: 0.9 },
      uVeinA: { value: new THREE.Color() }, uVeinB: { value: new THREE.Color() }, uVeinC: { value: new THREE.Color() },
      uGrowth: { value: 1 }, uStreak: { value: 1 }, uStripes: { value: 40 },
      uNumSrc: { value: 0 }, uSrcPos: { value: [] as THREE.Vector4[] }, uSrcForce: { value: [] as THREE.Vector4[] }, uSrcCol: { value: [] as THREE.Vector4[] },
    },
    extensions: { derivatives: true } as unknown as THREE.ShaderMaterial['extensions'],
    vertexShader: /* glsl */ `
      ${NOISE}
      ${FIELD}
      uniform float uFlowScale;
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vT;
      varying float vCrest;
      varying float vValley;
      varying vec3 vDir;
      vec3 surf(vec3 d) {
        vec3 p0 = d * uStretch * uR;
        return d * uStretch * (uR + disp(p0));
      }
      void main() {
        vec3 d = normalize(position);
        vec3 p = surf(d);
        vec3 up = abs(d.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 t1 = normalize(cross(up, d));
        vec3 t2 = cross(d, t1);
        const float e = 0.006;
        vec3 pa = surf(normalize(d + t1 * e));
        vec3 pb = surf(normalize(d + t2 * e));
        vec3 n = normalize(cross(pa - p, pb - p));
        if (dot(n, d) < 0.0) n = -n;
        vec3 cu = curl3(p * uFlowScale + vec3(uTime * 0.04, 0.0, uTime * 0.02));
        vec3 t = cu - n * dot(cu, n);
        vT = normalize(t + 1e-5);
        vN = n;
        vP = p;
        vDir = d;
        vCrest = crestOf(p);
        vValley = disp(d * uStretch * uR) / max(uAmp, 0.01);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${NOISE}
      ${FIELD}
      uniform vec3 uKeyDir;
      uniform float uKey, uAmbient, uRim, uAlbedo, uSheen, uCrestGlow, uGrowth, uStreak, uStripes;
      uniform vec3 uVeinA, uVeinB, uVeinC;
      uniform int uNumSrc;
      uniform vec4 uSrcPos[${MAX_SOURCES}];
      uniform vec4 uSrcForce[${MAX_SOURCES}];
      uniform vec4 uSrcCol[${MAX_SOURCES}];
      varying vec3 vP;
      varying vec3 vN;
      varying vec3 vT;
      varying float vCrest;
      varying float vValley;
      varying vec3 vDir;
      void main() {
        // growth: patches of matter appear as the music accumulates, with a particulate edge
        float m = 0.5 + 0.5 * snoise3(vDir * 1.8 + 3.0);
        float edge = uGrowth * 1.15 - m;
        float dither = hh(gl_FragCoord.xy + fract(uTime) * 17.0);
        if (edge < 0.0 || (edge < 0.12 && dither > edge / 0.12)) discard;

        vec3 N = normalize(vN);
        vec3 T = normalize(vT);
        vec3 B = normalize(cross(T, N));
        vec3 V = normalize(cameraPosition - vP);
        // frayed silhouette
        float graze = abs(dot(N, V));
        if (dither > smoothstep(0.0, 0.07, graze)) discard;

        // combed fibres: noise stretched along the flow direction
        float across = dot(vP, B);
        float along = dot(vP, T);
        // combed strands = fine contour lines of the fold height, so they follow every fold
        // a sweeping stream function bent by the folds: long wavy strands, like combed hair
        float h = disp(vP);
        vec3 sdir = normalize(vec3(0.35, 1.0, 0.2) + vec3(snoise3(vP * 0.4), snoise3(vP * 0.4 + 4.0) * 0.5, snoise3(vP * 0.4 + 9.0)) * 0.9);
        float sweep = dot(vP, sdir) * 1.0 + h * 0.85
                    + snoise3(vP * 1.1 + 2.0) * 0.1 + snoise3(vP * 3.1 + 5.0) * 0.02;
        float hf = sweep * uStripes;
        float aa = 1.0 - smoothstep(0.25, 0.7, fwidth(hf));
        float f1 = sin(hf * 6.2831853) * aa;
        float f2 = snoise3(vec3(vP * 22.0)) * 0.5;
        float fib = (f1 * 0.6 + f2 * 0.4) * uStreak;
        // fibres are raised strands: sharpen them into ridges and grooves
        float strand = sign(fib) * pow(abs(fib), 0.6);
        vec3 G = vec3(dFdx(sweep), dFdy(sweep), 0.0);
        vec3 gW = normalize((inverse(viewMatrix) * vec4(normalize(G + 1e-6), 0.0)).xyz);
        vec3 across3 = normalize(gW - N * dot(gW, N) + B * 1e-3);
        vec3 Nf = normalize(N + across3 * cos(hf * 6.2831853) * aa * 0.45 * uStreak);

        vec3 L = normalize(uKeyDir);
        float wrap = max(dot(Nf, L) * 0.6 + 0.4, 0.0);
        float diff = wrap * wrap;
        vec3 H = normalize(L + V);
        float th = dot(T, H);
        float sheen = pow(sqrt(max(1.0 - th * th, 0.0)), 30.0) * uSheen;
        float rim = pow(1.0 - graze, 3.0) * uRim;
        float valley = smoothstep(-0.55, 0.45, vValley);
        float ao = mix(0.22, 1.0, valley);
        float tube = 0.5 + 0.5 * sin(hf * 6.2831853);
        float albedo = uAlbedo * mix(0.55, 1.12, pow(tube, 0.7) * aa + (1.0 - aa) * 0.6);
        vec3 col = vec3(albedo) * (uAmbient + diff * uKey) * ao;
        col += vec3(0.9, 0.92, 1.0) * sheen * uKey * 0.06 * ao;
        col += vec3(0.5, 0.55, 0.65) * rim * 0.05;

        // veins of light along the crests, and kindled by notes
        float region = fract(sin(dot(floor(vP * 1.6), vec3(12.9, 78.2, 37.7))) * 43758.5);
        vec3 vein = region < 0.45 ? uVeinA : region < 0.75 ? uVeinB : uVeinC;
        float cr = crestOf(vP);
        float bundle = pow(tube, 3.0) * aa + (1.0 - aa) * 0.3;
        float crest = (smoothstep(0.91, 0.993, cr) * bundle * 2.2 + smoothstep(0.98, 0.999, cr) * 0.7);
        vec3 emis = vein * crest * uCrestGlow * (0.6 + 0.4 * sin(uTime * 0.3 + region * 30.0));
        for (int i = 0; i < ${MAX_SOURCES}; i++) {
          if (i >= uNumSrc) break;
          vec3 dd = vP - uSrcPos[i].xyz;
          float r = uSrcForce[i].z * 1.4;
          float fall = exp(-dot(dd, dd) / (r * r));
          float line = smoothstep(0.8, 0.98, cr) + smoothstep(0.6, 0.0, valley) * 0.4;
          emis += uSrcCol[i].rgb * uSrcCol[i].a * fall * (0.05 + line) * (0.15 + bundle) * 0.6;
        }
        // a glowing rim where the matter is still growing
        if (edge < 0.25) emis += vein * (1.0 - edge / 0.25) * 0.35;
        gl_FragColor = vec4(col + emis, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  return mesh;
}
