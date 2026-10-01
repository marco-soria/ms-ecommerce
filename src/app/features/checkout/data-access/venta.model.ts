export type EstadoVenta = 'pendiente' | 'pagada' | 'cancelada';

export interface DetalleVenta {
  id: number;
  venta_id: string;
  product_id: number;
  cantidad: number;
  precio_unitario: number;
}

export interface Venta {
  id: string;
  user_id: string;
  estado: EstadoVenta;
  total: number;
  nombre_completo: string;
  direccion: string;
  stripe_session_id: string | null;
  created_at: string;
  detalle_venta?: DetalleVenta[];
}

export interface DatosEnvio {
  nombreCompleto: string;
  direccion: string;
}
