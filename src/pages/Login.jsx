import { useState } from 'react';
import { Boton, Campo, Input, Mensaje } from '../components/ui';
import { emailDeUsuario, mensajeDeError, supabase } from '../lib/supabase';

export default function Login({ errorInicial }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(errorInicial ?? '');
  const [cargando, setCargando] = useState(false);

  async function ingresar(e) {
    e.preventDefault();
    if (!usuario.trim() || !password) {
      setError('Completá usuario y contraseña.');
      return;
    }
    setCargando(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: emailDeUsuario(usuario),
      password,
    });
    setCargando(false);
    if (error) setError(mensajeDeError(error));
  }

  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <form onSubmit={ingresar} className="w-full max-w-sm space-y-5 rounded-2xl bg-white p-6 shadow-sm">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-emerald-800">Ayni</h1>
          <p className="text-stone-500">Dietética</p>
        </div>
        <Campo etiqueta="Usuario">
          <Input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="username"
            spellCheck={false}
          />
        </Campo>
        <Campo etiqueta="Contraseña">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Campo>
        <Mensaje>{error}</Mensaje>
        <Boton type="submit" className="w-full" disabled={cargando}>
          {cargando ? 'Ingresando…' : 'Ingresar'}
        </Boton>
      </form>
    </div>
  );
}
