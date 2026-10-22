import { useEffect, useState } from 'react';
import { Boton, Mensaje } from './components/ui';
import { configFaltante, mensajeDeError, supabase } from './lib/supabase';
import Ajustes from './pages/Ajustes';
import Aumento from './pages/Aumento';
import Compras from './pages/Compras';
import Configuracion from './pages/Configuracion';
import Login from './pages/Login';
import Productos from './pages/Productos';
import Proveedores from './pages/Proveedores';
import Reportes from './pages/Reportes';
import Venta from './pages/Venta';

const SECCIONES_MANAGER = [
  { id: 'venta', etiqueta: 'Venta', Componente: Venta },
  { id: 'productos', etiqueta: 'Productos', Componente: Productos },
  { id: 'proveedores', etiqueta: 'Proveedores', Componente: Proveedores },
  { id: 'compras', etiqueta: 'Mercadería', Componente: Compras },
  { id: 'ajustes', etiqueta: 'Stock', Componente: Ajustes },
  { id: 'aumento', etiqueta: 'Aumentos', Componente: Aumento },
  { id: 'config', etiqueta: 'Precios', Componente: Configuracion },
  { id: 'reportes', etiqueta: 'Reportes', Componente: Reportes },
];

export default function App() {
  const [sesion, setSesion] = useState(undefined);
  const [perfil, setPerfil] = useState(null);
  const [errorPerfil, setErrorPerfil] = useState('');
  const [seccion, setSeccion] = useState('venta');

  useEffect(() => {
    if (configFaltante) return;
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setSesion(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = sesion?.user?.id;
  useEffect(() => {
    setPerfil(null);
    if (!userId) return;
    let cancelado = false;
    supabase
      .from('perfiles')
      .select('nombre, rol, activo')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error || !data || !data.activo) {
          setErrorPerfil(error ? mensajeDeError(error) : 'Tu usuario no está habilitado. Hablá con el manager.');
          supabase.auth.signOut();
          return;
        }
        setErrorPerfil('');
        setPerfil(data);
        setSeccion('venta');
      });
    return () => {
      cancelado = true;
    };
  }, [userId]);

  if (configFaltante) {
    return (
      <div className="p-4">
        <Mensaje>Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env.</Mensaje>
      </div>
    );
  }

  if (sesion === undefined) return <Cargando />;
  if (!sesion) return <Login errorInicial={errorPerfil} />;
  if (!perfil) return <Cargando />;

  const esManager = perfil.rol === 'manager';
  const actual = SECCIONES_MANAGER.find((s) => s.id === seccion) ?? SECCIONES_MANAGER[0];
  const Pantalla = esManager ? actual.Componente : Venta;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 bg-emerald-800 text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2">
          <div>
            <div className="text-lg font-bold leading-tight">Ayni</div>
            <div className="text-sm text-emerald-100">
              {perfil.nombre} · {esManager ? 'Manager' : 'Empleada'}
            </div>
          </div>
          <Boton
            variante="secundario"
            className="min-h-11 border-0 text-base"
            onClick={() => supabase.auth.signOut()}
          >
            Salir
          </Boton>
        </div>
        {esManager && (
          <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-2 pb-2">
            {SECCIONES_MANAGER.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSeccion(s.id)}
                className={`min-h-11 shrink-0 rounded-lg px-4 text-base font-semibold ${
                  s.id === actual.id ? 'bg-white text-emerald-800' : 'text-emerald-50 active:bg-emerald-700'
                }`}
              >
                {s.etiqueta}
              </button>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Pantalla esManager={esManager} />
      </main>
    </div>
  );
}

function Cargando() {
  return <div className="flex min-h-dvh items-center justify-center text-lg text-stone-500">Cargando…</div>;
}
