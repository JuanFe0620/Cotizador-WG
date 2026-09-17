import { DB_CLIENTES } from '../data/database';

export const buscarClientePorNit = (nit) => {
  return DB_CLIENTES[nit] || { razonSocial: '', contacto: '', email: '', ciudad: '' };
};