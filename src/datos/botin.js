// Qué sale en las cajas (plan, sección 1.4). El peso es la probabilidad: suman 100.
export const BOTIN = [
  { tipo: 'botiquin', peso: 20 },
  { tipo: 'arma', arma: 'subfusil', peso: 15 },
  { tipo: 'chaleco', peso: 15 },
  { tipo: 'arma', arma: 'escopeta', peso: 12 },
  { tipo: 'arma', arma: 'rifle', peso: 12 },
  { tipo: 'granada', peso: 10 },
  { tipo: 'gel', cantidad: 2, peso: 10 },
  { tipo: 'arma', arma: 'franco', peso: 6 },
];

export const BOTIN_ESCOPETAS = [
  { tipo: 'arma', arma: 'escopeta', peso: 50 },
  { tipo: 'botiquin', peso: 25 },
  { tipo: 'gel', cantidad: 2, peso: 25 },
];

export const BOTIN_AIRDROP = [
  { tipo: 'arma', arma: 'dorado', peso: 50 },
  { tipo: 'gel', cantidad: 2, peso: 50 },
];

// Elige un elemento de la tabla según su peso
export function sortear(tabla) {
  const total = tabla.reduce((suma, o) => suma + o.peso, 0);
  let r = Math.random() * total;
  for (const o of tabla) {
    r -= o.peso;
    if (r < 0) return o;
  }
  return tabla[tabla.length - 1];
}
